import React, { useState } from 'react';
import { userMessagingService, type MessageType, type MessagePriority } from '../../lib/user-messaging';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface UserComplaintPanelProps {
  userId: string;
  username: string;
  email?: string;
  onClose?: () => void;
}

const neonStyle = `
  .neon-input {
    border-color: #00ffff !important;
    color: #00ffff !important;
    background: rgba(0, 10, 40, 0.8) !important;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3) !important;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
  }

  .neon-input::placeholder {
    color: rgba(0, 255, 255, 0.5) !important;
  }

  .neon-input:focus {
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.6) !important;
    border-color: #ff00ff !important;
  }

  .neon-button {
    background: linear-gradient(135deg, #ff00ff, #00ffff) !important;
    color: #0a0e27 !important;
    border: 2px solid #ff00ff !important;
    font-weight: bold !important;
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.5) !important;
    text-shadow: 0 0 5px rgba(255, 0, 255, 0.3) !important;
  }

  .neon-button:hover {
    box-shadow: 0 0 30px rgba(255, 0, 255, 0.8) !important;
    transform: scale(1.02) !important;
  }

  .neon-card {
    background: rgba(15, 21, 51, 0.8) !important;
    border: 2px solid #00ffff !important;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3) !important;
    backdrop-filter: blur(10px) !important;
  }

  .neon-title {
    color: #00ffff !important;
    text-shadow: 0 0 15px rgba(0, 255, 255, 0.6) !important;
    font-weight: bold !important;
  }

  .neon-badge {
    background: linear-gradient(135deg, #ff00ff, #00ffff) !important;
    color: #0a0e27 !important;
    border: 1px solid #ff00ff !important;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.4) !important;
  }

  .neon-text {
    color: #00ffff !important;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.4) !important;
  }

  .message-item {
    background: rgba(10, 14, 40, 0.6) !important;
    border-left: 4px solid #00ffff !important;
    box-shadow: inset 0 0 10px rgba(0, 255, 255, 0.1) !important;
    transition: all 0.3s ease !important;
  }

  .message-item:hover {
    border-left-color: #ff00ff !important;
    background: rgba(15, 21, 51, 0.8) !important;
    box-shadow: inset 0 0 15px rgba(255, 0, 255, 0.1), 0 0 15px rgba(0, 255, 255, 0.2) !important;
  }
`;

export const UserComplaintPanel: React.FC<UserComplaintPanelProps> = ({ userId, username, email, onClose }) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  const [messageType, setMessageType] = useState<MessageType>('complaint');
  const [priority, setPriority] = useState<MessagePriority>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [userMessages, setUserMessages] = useState(userMessagingService.getUserMessages(userId));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      const newMessage = userMessagingService.createUserMessage(
        userId,
        username,
        messageType,
        subject,
        message,
        priority,
        email
      );

      if (messageType === 'review') {
        newMessage.metadata.rating = rating;
      }

      setUserMessages(userMessagingService.getUserMessages(userId));
      setSubject('');
      setMessage('');
      setRating(5);
      setSuccessMessage('Your message has been sent successfully!');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error submitting message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{neonStyle}</style>

      <div className="w-full max-w-2xl mx-auto p-4">
        <Card className="neon-card">
          <CardHeader>
            <CardTitle className="neon-title">📬 Contact & Feedback</CardTitle>
            <CardDescription className="neon-text">Send complaints, reviews, or feature requests to our admin team</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 border-b-2 border-cyan-500/30">
              <button
                onClick={() => setActiveTab('submit')}
                className={`px-4 py-2 font-bold transition-all ${
                  activeTab === 'submit'
                    ? 'neon-badge text-xs md:text-sm'
                    : 'neon-text hover:text-pink-400 text-xs md:text-sm'
                }`}
              >
                ✉️ Send Message
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 font-bold transition-all ${
                  activeTab === 'history'
                    ? 'neon-badge text-xs md:text-sm'
                    : 'neon-text hover:text-pink-400 text-xs md:text-sm'
                }`}
              >
                📋 Message History ({userMessages.length})
              </button>
            </div>

            {/* Submit Tab */}
            {activeTab === 'submit' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {successMessage && (
                  <div className="p-3 bg-green-500/20 border-l-4 border-green-400 rounded neon-text">
                    ✓ {successMessage}
                  </div>
                )}

                {/* Message Type */}
                <div>
                  <label className="neon-text block text-sm font-bold mb-2">Message Type</label>
                  <Select value={messageType} onValueChange={(value) => setMessageType(value as MessageType)}>
                    <SelectTrigger className="neon-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-2 border-cyan-500/50">
                      <SelectItem value="complaint" className="neon-text">
                        ⚠️ Complaint
                      </SelectItem>
                      <SelectItem value="review" className="neon-text">
                        ⭐ Review
                      </SelectItem>
                      <SelectItem value="bug_report" className="neon-text">
                        🐛 Bug Report
                      </SelectItem>
                      <SelectItem value="feature_request" className="neon-text">
                        💡 Feature Request
                      </SelectItem>
                      <SelectItem value="general" className="neon-text">
                        💬 General Feedback
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <label className="neon-text block text-sm font-bold mb-2">Priority</label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as MessagePriority)}>
                    <SelectTrigger className="neon-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-2 border-cyan-500/50">
                      <SelectItem value="low" className="neon-text">
                        🟢 Low
                      </SelectItem>
                      <SelectItem value="medium" className="neon-text">
                        🟡 Medium
                      </SelectItem>
                      <SelectItem value="high" className="neon-text">
                        🔴 High
                      </SelectItem>
                      <SelectItem value="urgent" className="neon-text">
                        ⛔ Urgent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rating (for reviews only) */}
                {messageType === 'review' && (
                  <div>
                    <label className="neon-text block text-sm font-bold mb-2">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`text-2xl transition-all ${
                            star <= rating
                              ? 'text-yellow-400 drop-shadow-lg scale-110'
                              : 'text-gray-600 hover:text-yellow-300'
                          }`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label className="neon-text block text-sm font-bold mb-2">Subject</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief subject of your message..."
                    className="neon-input text-xs md:text-sm"
                    disabled={submitting}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="neon-text block text-sm font-bold mb-2">Message</label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your message in detail..."
                    className="neon-input text-xs md:text-sm min-h-24"
                    disabled={submitting}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-2 pt-4">
                  <Button className="neon-button flex-1 text-xs md:text-sm" disabled={submitting} type="submit">
                    {submitting ? '⏳ Sending...' : '🚀 Send Message'}
                  </Button>
                  {onClose && (
                    <Button
                      variant="outline"
                      className="neon-button flex-1 text-xs md:text-sm"
                      onClick={onClose}
                      disabled={submitting}
                    >
                      ✕ Close
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {userMessages.length === 0 ? (
                  <p className="neon-text text-center py-8">No messages sent yet</p>
                ) : (
                  userMessages.map((msg) => (
                    <div key={msg.id} className="message-item p-4 rounded">
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="neon-title text-sm md:text-base font-bold truncate">{msg.subject}</div>
                          <p className="neon-text text-xs md:text-sm mt-1 line-clamp-2">{msg.message}</p>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          <Badge className={`neon-badge text-xs font-bold ${getTypeColor(msg.type)}`}>
                            {getTypeEmoji(msg.type)} {msg.type}
                          </Badge>
                          <Badge className={`text-xs font-bold ${getStatusColor(msg.status)}`}>
                            {getStatusEmoji(msg.status)} {msg.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="neon-text text-xs mt-2 opacity-70">
                        {new Date(msg.createdAt).toLocaleDateString()} • {msg.priority}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

function getTypeEmoji(type: MessageType): string {
  const emojis: Record<MessageType, string> = {
    complaint: '⚠️',
    review: '⭐',
    bug_report: '🐛',
    feature_request: '💡',
    general: '💬',
  };
  return emojis[type] || '💬';
}

function getTypeColor(type: MessageType): string {
  const colors: Record<MessageType, string> = {
    complaint: 'bg-red-500/20 text-red-300',
    review: 'bg-yellow-500/20 text-yellow-300',
    bug_report: 'bg-purple-500/20 text-purple-300',
    feature_request: 'bg-blue-500/20 text-blue-300',
    general: 'bg-cyan-500/20 text-cyan-300',
  };
  return colors[type] || 'bg-cyan-500/20 text-cyan-300';
}

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    new: '🆕',
    read: '👁️',
    in_progress: '⏳',
    resolved: '✅',
    closed: '🔒',
  };
  return emojis[status] || '📦';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    new: 'bg-cyan-500/20 text-cyan-300',
    read: 'bg-blue-500/20 text-blue-300',
    in_progress: 'bg-yellow-500/20 text-yellow-300',
    resolved: 'bg-green-500/20 text-green-300',
    closed: 'bg-gray-500/20 text-gray-300',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-300';
}
