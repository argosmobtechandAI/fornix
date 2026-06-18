"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, Send, Flag, Reply, User, Clock, MessageSquare, Paperclip, Smile, MoreVertical, Check, CheckCheck } from "lucide-react";

export default function DiscussionChatClient({ discussionId }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!discussionId) return;
    fetchPosts();
    // Start polling for new messages
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, [discussionId]);

  useEffect(() => {
    scrollToBottom();
  }, [posts]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  async function fetchPosts() {
    if (!discussionId) return;
    try {
      const res = await fetch(`/api/doctor/discussions/${discussionId}/posts`);
      const json = await res.json();
      if (json.success) {
        setPosts(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim()) return;
    if (!discussionId) {
      alert('Invalid discussion. Please reload the page.');
      return;
    }
    setTyping(true);
    try {
      const payload = { 
        content: message,
        reply_to: replyingTo?.id
      };
      
      const res = await fetch(`/api/doctor/discussions/${discussionId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Send failed");
      
      setMessage("");
      setReplyingTo(null);
      await fetchPosts();
    } catch (err) {
      console.error(err);
      alert("Failed to send message");
    } finally {
      setTyping(false);
    }
  }

  async function handleReport(postId) {
    if (!postId) {
      alert("Invalid post. Please reload the page.");
      return;
    }
    if (!confirm("Report this message for inappropriate content?")) return;
    try {
      const res = await fetch(`/api/doctor/discussions/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Inappropriate content" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Report failed");
      alert("Message has been reported");
    } catch (err) {
      console.error(err);
      alert("Report failed");
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Handle file upload logic here
      console.log("Selected file:", file);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px] bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-full">
            <MessageSquare className="text-orange-600" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-800">Discussion Chat</h2>
            <p className="text-xs text-gray-600">ID: #{discussionId?.slice(-6)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">
            {posts.length} message{posts.length !== 1 ? 's' : ''}
          </div>
          <button 
            onClick={fetchPosts}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Loader2 className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} size={16} />
          </button>
        </div>
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-orange-50 border-b border-orange-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply className="text-orange-500" size={14} />
              <span className="text-sm text-orange-800 font-medium">Replying to:</span>
              <span className="text-sm text-gray-700">{replyingTo.users?.full_name || "User"}</span>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-600 truncate mt-1">{replyingTo.content}</p>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="animate-spin text-orange-500 mx-auto mb-3" size={32} />
              <p className="text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="text-gray-400" size={24} />
            </div>
            <p className="font-medium text-gray-600">No messages yet</p>
            <p className="text-sm mt-1">Start the conversation by sending a message</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isDoctor = post.users?.role === 'doctor' || post.users?.is_doctor;
              const isDeleted = post.deleted;
              
              return (
                <div 
                  key={post.id} 
                  className={`group flex ${isDoctor ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isDoctor ? 'order-2' : 'order-1'}`}>
                    <div className="flex flex-col gap-1">
                      {/* Sender info */}
                      <div className={`flex items-center gap-2 ${isDoctor ? 'justify-end' : ''}`}>
                        {!isDoctor && (
                          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            <User className="text-white" size={12} />
                          </div>
                        )}
                        <span className={`text-xs font-medium ${isDoctor ? 'text-orange-600' : 'text-gray-600'}`}>
                          {post.users?.full_name || (isDoctor ? 'You' : 'Student')}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(post.created_at)}
                        </span>
                      </div>

                      {/* Message bubble */}
                      <div className={`relative rounded-2xl px-4 py-3 shadow-sm ${
                        isDoctor 
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-tr-none' 
                          : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                      }`}>
                        {/* Reply indicator */}
                        {post.reply_to && post.reply_to_post && (
                          <div className={`mb-2 p-2 rounded-lg border-l-2 ${
                            isDoctor ? 'border-orange-300 bg-orange-400/20' : 'border-gray-300 bg-gray-100'
                          }`}>
                            <div className="flex items-center gap-1 text-xs">
                              <Reply size={10} />
                              <span className="font-medium">
                                {post.reply_to_post.users?.full_name || 'User'}
                              </span>
                            </div>
                            <p className="text-xs truncate">{post.reply_to_post.content}</p>
                          </div>
                        )}

                        {/* Message content */}
                        {isDeleted ? (
                          <div className="italic text-gray-500">Message deleted</div>
                        ) : (
                          <div className="whitespace-pre-wrap break-words">{post.content}</div>
                        )}

                        {/* Message status */}
                        {isDoctor && (
                          <div className="flex justify-end mt-1">
                            <div className="flex items-center gap-1 text-xs opacity-70">
                              <CheckCheck size={12} />
                              <span>Delivered</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Message actions */}
                      <div className={`flex items-center gap-2 mt-1 ${isDoctor ? 'justify-end' : ''}`}>
                        {!isDoctor && (
                          <>
                            <button
                              onClick={() => setReplyingTo(post)}
                              className="text-xs text-gray-500 hover:text-orange-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Reply size={12} />
                              Reply
                            </button>
                            {post.id && (
                              <button 
                                onClick={() => handleReport(post.id)}
                                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Flag size={12} />
                                Report
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Doctor avatar on right side */}
                  {isDoctor && (
                    <div className="order-1 ml-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        D
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typing && (
        <div className="px-4 py-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-gray-600">Sending...</span>
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-3">
          <div className="flex-1 bg-gray-50 border border-gray-300 rounded-2xl p-2 focus-within:border-orange-500 transition-all">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full shadow-0 bg-transparent border-none focus:outline-none resize-none text-sm"
              style={{boxShadow:"none !important"}}
              rows={2}
              placeholder="Type your message here..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center hidden gap-2">
                <button 
                  type="button"
                  onClick={handleFileUpload}
                  className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                >
                  <Paperclip size={18} />
                </button>
                <button 
                  type="button"
                  className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
                >
                  <Smile size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
              
              <div className="text-xs text-gray-500">
                {message.length}/2000
              </div>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={!discussionId || !message.trim() || typing}
            className="p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 transition-all"
          >
            {typing ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </div>
      </form>
    </div>
  );
}