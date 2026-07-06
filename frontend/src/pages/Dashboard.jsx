import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Trash2, ArrowRight } from 'lucide-react';
import { api } from '../api/client';

export default function Dashboard() {
  const [queues, setQueues] = useState([]);
  const [newQueueName, setNewQueueName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadQueues = async () => {
    try {
      const data = await api.getQueues();
      setQueues(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueues();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const queue = await api.createQueue(newQueueName);
      setQueues((prev) => [queue, ...prev]);
      setNewQueueName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this queue and all its tokens?')) return;
    try {
      await api.deleteQueue(id);
      setQueues((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Your Queues</h2>
          <p>Create and manage service queues</p>
        </div>
      </header>

      <form className="create-queue-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="Enter queue name (e.g. Customer Service, Billing)"
          value={newQueueName}
          onChange={(e) => setNewQueueName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          <Plus size={18} />
          {creating ? 'Creating...' : 'Create Queue'}
        </button>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading queues...</div>
      ) : queues.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No queues yet</h3>
          <p>Create your first queue to start managing tokens</p>
        </div>
      ) : (
        <div className="queue-grid">
          {queues.map((queue) => (
            <div key={queue.id} className="queue-card">
              <div className="queue-card-header">
                <h3>{queue.name}</h3>
                <button
                  className="btn-icon btn-danger-subtle"
                  onClick={() => handleDelete(queue.id)}
                  title="Delete queue"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="queue-card-stats">
                <div className="stat">
                  <span className="stat-value">{queue.waiting_count}</span>
                  <span className="stat-label">Waiting</span>
                </div>
              </div>
              <Link to={`/queues/${queue.id}`} className="btn btn-secondary btn-full">
                Manage Queue
                <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}