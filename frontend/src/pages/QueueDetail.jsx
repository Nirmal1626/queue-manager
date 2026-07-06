import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, ChevronUp, ChevronDown, X, Play,
  Ticket, Clock, UserPlus,
} from 'lucide-react';
import { api } from '../api/client';

function formatWaitTime(createdAt) {
  const diff = Date.now() - new Date(createdAt + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function QueueDetail() {
  const { id } = useParams();
  const [queue, setQueue] = useState(null);
  const [personName, setPersonName] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [servedMessage, setServedMessage] = useState('');

  const loadQueue = useCallback(async () => {
    try {
      const data = await api.getQueue(id);
      setQueue(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 10000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!personName.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      await api.addToken(id, personName);
      setPersonName('');
      await loadQueue();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveUp = async (tokenId) => {
    setActionLoading(true);
    try {
      const tokens = await api.moveUp(id, tokenId);
      setQueue((prev) => ({ ...prev, tokens }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveDown = async (tokenId) => {
    setActionLoading(true);
    try {
      const tokens = await api.moveDown(id, tokenId);
      setQueue((prev) => ({ ...prev, tokens }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleServeNext = async () => {
    setActionLoading(true);
    setServedMessage('');
    try {
      const { served } = await api.serveNext(id);
      setServedMessage(`Token #${served.token_number} (${served.person_name}) assigned for service`);
      await loadQueue();
      setTimeout(() => setServedMessage(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (tokenId) => {
    if (!confirm('Cancel this token?')) return;
    setActionLoading(true);
    try {
      const tokens = await api.cancelToken(id, tokenId);
      setQueue((prev) => ({ ...prev, tokens }));
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-state">Loading queue...</div>;
  if (!queue) return <div className="alert alert-error">Queue not found</div>;

  const tokens = queue.tokens || [];

  return (
    <div className="page">
      <Link to="/" className="back-link">
        <ArrowLeft size={18} />
        Back to Queues
      </Link>

      <header className="page-header">
        <div>
          <h2>{queue.name}</h2>
          <p>{tokens.length} {tokens.length === 1 ? 'person' : 'people'} waiting</p>
        </div>
        <button
          className="btn btn-success btn-lg"
          onClick={handleServeNext}
          disabled={actionLoading || tokens.length === 0}
        >
          <Play size={20} />
          Serve Next
        </button>
      </header>

      {servedMessage && <div className="alert alert-success">{servedMessage}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="queue-detail-grid">
        <section className="panel">
          <h3>
            <UserPlus size={20} />
            Add to Queue
          </h3>
          <form onSubmit={handleAdd} className="add-token-form">
            <input
              type="text"
              placeholder="Person name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
              <Plus size={18} />
              Add Token
            </button>
          </form>
        </section>

        <section className="panel panel-wide">
          <h3>
            <Ticket size={20} />
            Waiting List
          </h3>

          {tokens.length === 0 ? (
            <div className="empty-state compact">
              <Ticket size={36} />
              <p>No tokens in queue. Add someone to get started.</p>
            </div>
          ) : (
            <div className="token-list">
              {tokens.map((token, index) => (
                <div
                  key={token.id}
                  className={`token-item ${index === 0 ? 'token-item-first' : ''}`}
                >
                  <div className="token-position">
                    {index === 0 ? (
                      <span className="badge badge-next">NEXT</span>
                    ) : (
                      <span className="position-number">{token.position}</span>
                    )}
                  </div>

                  <div className="token-info">
                    <div className="token-number">#{token.token_number}</div>
                    <div className="token-name">{token.person_name}</div>
                    <div className="token-wait">
                      <Clock size={14} />
                      {formatWaitTime(token.created_at)}
                    </div>
                  </div>

                  <div className="token-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleMoveUp(token.id)}
                      disabled={actionLoading || index === 0}
                      title="Move up"
                    >
                      <ChevronUp size={18} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleMoveDown(token.id)}
                      disabled={actionLoading || index === tokens.length - 1}
                      title="Move down"
                    >
                      <ChevronDown size={18} />
                    </button>
                    <button
                      className="btn-icon btn-danger-subtle"
                      onClick={() => handleCancel(token.id)}
                      disabled={actionLoading}
                      title="Cancel token"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}