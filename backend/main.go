package main

import (
	"context"
	"embed"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed static/*
var staticFiles embed.FS

type Config struct {
	DatabaseURL string
	Port        string
	CacheSize   int
	RateLimit   int
}

func loadConfig() Config {
	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        os.Getenv("PORT"),
		CacheSize:   5,
		RateLimit:   10,
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if v := os.Getenv("CACHE_SIZE"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.CacheSize = n
		}
	}
	if v := os.Getenv("RATE_LIMIT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			cfg.RateLimit = n
		}
	}
	return cfg
}

type Cache struct {
	mu       sync.RWMutex
	capacity int
	items    map[string]string
	order    []string
}

func NewCache(capacity int) *Cache {
	return &Cache{
		capacity: capacity,
		items:    make(map[string]string),
		order:    make([]string, 0, capacity),
	}
}

func (c *Cache) Get(hash string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	data, ok := c.items[hash]
	return data, ok
}

func (c *Cache) Set(hash, data string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if _, exists := c.items[hash]; exists {
		c.items[hash] = data
		c.moveToFront(hash)
		return
	}

	if len(c.order) >= c.capacity {
		oldest := c.order[len(c.order)-1]
		delete(c.items, oldest)
		c.order = c.order[:len(c.order)-1]
	}

	c.items[hash] = data
	c.order = append([]string{hash}, c.order...)
}

func (c *Cache) moveToFront(hash string) {
	for i, h := range c.order {
		if h == hash {
			c.order = append(c.order[:i], c.order[i+1:]...)
			c.order = append([]string{hash}, c.order...)
			return
		}
	}
}

type RateLimiter struct {
	mu       sync.Mutex
	requests map[string][]time.Time
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int) *RateLimiter {
	rl := &RateLimiter{
		requests: make(map[string][]time.Time),
		limit:    limit,
		window:   time.Minute,
	}
	go rl.cleanup()
	return rl
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	times := rl.requests[ip]
	valid := make([]time.Time, 0, len(times))
	for _, t := range times {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}

	if len(valid) >= rl.limit {
		rl.requests[ip] = valid
		return false
	}

	rl.requests[ip] = append(valid, now)
	return true
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		cutoff := now.Add(-rl.window)
		for ip, times := range rl.requests {
			valid := make([]time.Time, 0)
			for _, t := range times {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.requests, ip)
			} else {
				rl.requests[ip] = valid
			}
		}
		rl.mu.Unlock()
	}
}

type Server struct {
	db    *pgxpool.Pool
	cache *Cache
	rl    *RateLimiter
}

func NewServer(db *pgxpool.Pool, cache *Cache, rl *RateLimiter) *Server {
	return &Server{db: db, cache: cache, rl: rl}
}

func (s *Server) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			ip = xff
		}
		if !s.rl.Allow(ip) {
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleGet(w http.ResponseWriter, r *http.Request) {
	hash := chi.URLParam(r, "hash")
	if hash == "" {
		http.Error(w, "hash required", http.StatusBadRequest)
		return
	}

	if data, ok := s.cache.Get(hash); ok {
		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte(data))
		return
	}

	var data string
	err := s.db.QueryRow(r.Context(),
		"SELECT data FROM dashboards WHERE hash = $1", hash).Scan(&data)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	s.cache.Set(hash, data)
	w.Header().Set("Content-Type", "text/plain")
	w.Write([]byte(data))
}

func (s *Server) handlePost(w http.ResponseWriter, r *http.Request) {
	hash := chi.URLParam(r, "hash")
	if hash == "" {
		http.Error(w, "hash required", http.StatusBadRequest)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	data := string(body)

	_, err = s.db.Exec(r.Context(), `
		INSERT INTO dashboards (hash, data, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (hash) DO UPDATE SET data = $2, updated_at = NOW()
	`, hash, data)
	if err != nil {
		log.Printf("db error: %v", err)
		http.Error(w, "failed to save", http.StatusInternalServerError)
		return
	}

	s.cache.Set(hash, data)
	w.WriteHeader(http.StatusOK)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("OK"))
}

func migrateDB(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS dashboards (
			hash TEXT PRIMARY KEY,
			data TEXT NOT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)
	return err
}

func spaHandler(staticFS fs.FS) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		file, err := staticFS.Open(path)
		if err != nil {
			file, err = staticFS.Open("index.html")
			if err != nil {
				http.Error(w, "not found", http.StatusNotFound)
				return
			}
			path = "index.html"
		}
		defer file.Close()

		stat, err := file.Stat()
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		if stat.IsDir() {
			file, err = staticFS.Open(path + "/index.html")
			if err != nil {
				file, err = staticFS.Open("index.html")
				if err != nil {
					http.Error(w, "not found", http.StatusNotFound)
					return
				}
			}
			defer file.Close()
		}

		content, err := io.ReadAll(file)
		if err != nil {
			http.Error(w, "error reading file", http.StatusInternalServerError)
			return
		}

		contentType := "application/octet-stream"
		switch {
		case strings.HasSuffix(path, ".html"):
			contentType = "text/html; charset=utf-8"
		case strings.HasSuffix(path, ".css"):
			contentType = "text/css; charset=utf-8"
		case strings.HasSuffix(path, ".js"):
			contentType = "application/javascript; charset=utf-8"
		case strings.HasSuffix(path, ".json"):
			contentType = "application/json; charset=utf-8"
		case strings.HasSuffix(path, ".png"):
			contentType = "image/png"
		case strings.HasSuffix(path, ".jpg"), strings.HasSuffix(path, ".jpeg"):
			contentType = "image/jpeg"
		case strings.HasSuffix(path, ".svg"):
			contentType = "image/svg+xml"
		case strings.HasSuffix(path, ".ico"):
			contentType = "image/x-icon"
		case strings.HasSuffix(path, ".woff"):
			contentType = "font/woff"
		case strings.HasSuffix(path, ".woff2"):
			contentType = "font/woff2"
		}

		w.Header().Set("Content-Type", contentType)
		if strings.HasSuffix(path, ".js") || strings.HasSuffix(path, ".css") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		w.Write(content)
	}
}

func main() {
	cfg := loadConfig()

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := migrateDB(ctx, db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	cache := NewCache(cfg.CacheSize)
	rl := NewRateLimiter(cfg.RateLimit)
	server := NewServer(db, cache, rl)

	staticFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatalf("failed to get static fs: %v", err)
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Route("/api", func(r chi.Router) {
		r.Use(server.rateLimitMiddleware)
		r.Get("/health", server.handleHealth)
		r.Get("/data/{hash}", server.handleGet)
		r.Post("/data/{hash}", server.handlePost)
	})

	r.Handle("/*", spaHandler(staticFS))

	log.Printf("Starting server on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
