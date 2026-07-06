import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Clock, Users, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { api } from '../api/client';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-state">Loading analytics...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { overview, waitTimeByQueue, queueLengthTrend, recentActivity, hourlyVolume } = data;

  const trendByQueue = {};
  queueLengthTrend.forEach((snap) => {
    if (!trendByQueue[snap.queue_name]) trendByQueue[snap.queue_name] = [];
    trendByQueue[snap.queue_name].push({
      time: new Date(snap.recorded_at + 'Z').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count: snap.waiting_count,
    });
  });

  const trendData = Object.entries(trendByQueue).flatMap(([name, points]) =>
    points.map((p) => ({ ...p, queue: name }))
  );

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, '0');
    const found = hourlyVolume.find((h) => h.hour === hour);
    return { hour: `${hour}:00`, count: found?.count || 0 };
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Analytics Dashboard</h2>
          <p>Queue performance and wait time insights</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-blue">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-card-value">{overview.total_waiting}</div>
            <div className="stat-card-label">Currently Waiting</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-green">
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-card-value">{overview.total_served}</div>
            <div className="stat-card-label">Total Served</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-red">
            <XCircle size={24} />
          </div>
          <div>
            <div className="stat-card-value">{overview.total_cancelled}</div>
            <div className="stat-card-label">Cancelled</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-icon-purple">
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-card-value">{overview.avg_wait_minutes}m</div>
            <div className="stat-card-label">Avg Wait Time</div>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <section className="panel">
          <h3>
            <TrendingUp size={20} />
            Queue Length Trend
          </h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} name="Waiting" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state compact"><p>No trend data yet. Activity will appear as you use queues.</p></div>
          )}
        </section>

        <section className="panel">
          <h3>Avg Wait Time by Queue</h3>
          {waitTimeByQueue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={waitTimeByQueue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="queue_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="m" />
                <Tooltip formatter={(v) => [`${v} min`, 'Avg Wait']} />
                <Bar dataKey="avg_wait_minutes" fill="#6366f1" radius={[6, 6, 0, 0]} name="Avg Wait (min)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state compact"><p>No served tokens yet to calculate wait times.</p></div>
          )}
        </section>

        <section className="panel">
          <h3>Hourly Token Volume</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} name="Tokens Added" />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="panel">
          <h3>Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="activity-list">
              {recentActivity.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-token">#{item.token_number}</div>
                  <div className="activity-details">
                    <span className="activity-name">{item.person_name}</span>
                    <span className="activity-queue">{item.queue_name}</span>
                  </div>
                  <span className={`badge badge-${item.status}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact"><p>No activity yet.</p></div>
          )}
        </section>
      </div>
    </div>
  );
}