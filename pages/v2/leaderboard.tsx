import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../../styles/leaderboard.module.css';

interface LeaderboardEntry {
  model: string;
  score: number;
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalBattles, setTotalBattles] = useState(0);

  // Resolve CLIENT_KEY from multiple sources
  async function loadClientKey(): Promise<string | null> {
    // Try loading from our API endpoint
    try {
      const resp = await fetch('/api/leaderboard-config', { cache: 'no-store' });
      if (resp.ok) {
        const cfg = await resp.json();
        if (cfg && cfg.CLIENT_KEY) return cfg.CLIENT_KEY;
      }
    } catch (e) {
      console.error('Failed to load client key from API:', e);
    }

    // Try a meta tag as fallback
    try {
      const meta = document.querySelector('meta[name="client-key"]');
      if (meta && meta.getAttribute('content')) {
        return meta.getAttribute('content');
      }
    } catch (e) {
      // ignore
    }

    return null;
  }

  // Fetch leaderboard from API
  async function getLeaderboard() {
    setLoading(true);
    setError(null);

    // Resolve client key
    const clientKey = await loadClientKey();
    if (!clientKey) {
      setError('CLIENT_KEY not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch('https://brickyard-worker.rileyseefeldt.workers.dev/api/leaderboard', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Key': clientKey
        }
      });

      if (!resp.ok) {
        throw new Error(`Leaderboard API request failed: ${resp.status} ${resp.statusText}`);
      }

      const json = await resp.json();
      console.log('raw leaderboard response', json);

      // Normalize the response into an array of { model, score }
      let normalizedEntries: LeaderboardEntry[] = [];

      if (json == null) {
        normalizedEntries = [];
      } else if (Array.isArray(json.leaderboard)) {
        // Already an array of objects
        normalizedEntries = json.leaderboard.map((item: any) => ({
          model: item.model_type || item.model || item.name,
          score: Number(item.num ?? item.score ?? 0)
        }));
      } else if (json.leaderboard && typeof json.leaderboard === 'object') {
        // Object mapping model -> count
        normalizedEntries = Object.entries(json.leaderboard).map(([k, v]) => ({
          model: k,
          score: Number(v)
        }));
      } else if (Array.isArray(json)) {
        // Maybe the root is an array
        normalizedEntries = json.map((item: any) => ({
          model: item.model_type || item.model || item.name,
          score: Number(item.num ?? item.score ?? 0)
        }));
      } else {
        // Unknown shape — try to discover keys
        console.warn('Unknown leaderboard shape, attempting best-effort parse');
        if (json.leaderboard) {
          try {
            normalizedEntries = Object.entries(json.leaderboard).map(([k, v]) => ({
              model: k,
              score: Number(v)
            }));
          } catch (e) {
            normalizedEntries = [];
          }
        }
      }

      // Sort highest first
      normalizedEntries.sort((a, b) => b.score - a.score);
      setEntries(normalizedEntries);

      // Calculate total battles
      const total = normalizedEntries.reduce((sum, entry) => sum + entry.score, 0);
      setTotalBattles(total);
    } catch (err: any) {
      console.error('Failed to load leaderboard', err);
      setError(`Error loading leaderboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getLeaderboard();
  }, []);

  const getMedalEmoji = (rank: number) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  // Calculate win rate percentage
  const getWinRate = (wins: number) => {
    if (totalBattles === 0) return 0;
    return (wins / totalBattles * 100);
  };

  return (
    <>
      <Head>
        <title>Leaderboard - The Brickyard</title>
        <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
      </Head>

      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <Link href="/v2" className={`${styles.backButton} ${styles.pixel}`}>
              ← Back to Arena
            </Link>
            <div className={styles.brand}>
              <h1 className={`${styles.title} ${styles.pixel}`}>The Brickyard</h1>
              <p className={`${styles.subtitle} ${styles.pixel}`}>Model Performance Leaderboard</p>
            </div>
          </header>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{totalBattles.toLocaleString()}</div>
              <div className={styles.statLabel}>Total Votes</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{entries.length}</div>
              <div className={styles.statLabel}>Active Models</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>Live</div>
              <div className={styles.statLabel}>Updates</div>
            </div>
          </div>

          <div className={styles.leaderboardCard}>
            <h2 className={`${styles.leaderboardTitle} ${styles.pixel}`}>
              🏆 Top Performers
            </h2>

            {loading && (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading rankings...</p>
              </div>
            )}

            {error && (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                fontSize: '1.1rem',
                color: '#dc2626',
                background: '#FEE2E2',
                borderRadius: '8px',
                margin: '20px'
              }}>
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <div className={styles.rankCol}>Rank</div>
                  <div className={styles.modelCol}>Model</div>
                  <div className={styles.winsCol}>Wins</div>
                  <div className={styles.totalCol}>Total</div>
                  <div className={styles.rateCol}>Win Rate</div>
                </div>

                {entries.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#475569',
                    fontSize: '1.1rem'
                  }}>
                    No leaderboard entries found.
                  </div>
                ) : (
                  entries.map((entry, index) => (
                    <div
                      key={index}
                      className={`${styles.tableRow} ${index < 3 ? styles.topThree : ''}`}
                    >
                      <div className={styles.rankCol}>
                        <span className={styles.rankNumber}>#{index + 1}</span>
                        <span className={styles.medal}>{getMedalEmoji(index + 1)}</span>
                      </div>
                      <div className={`${styles.modelCol} ${styles.pixel}`}>
                        {entry.model}
                      </div>
                      <div className={styles.winsCol}>
                        {entry.score.toLocaleString()}
                      </div>
                      <div className={styles.totalCol}>
                        {totalBattles.toLocaleString()}
                      </div>
                      <div className={styles.rateCol}>
                        <div className={styles.rateBar}>
                          <div
                            className={styles.rateFill}
                            style={{ width: `${getWinRate(entry.score)}%` }}
                          />
                          <span className={styles.rateText}>
                            {getWinRate(entry.score).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Rankings are based on head-to-head comparisons in LEGO model generation.
            </p>
            <p className={styles.footerText}>
              Live updates • Vote to influence the rankings
            </p>
          </div>
        </div>
      </div>
    </>
  );
}