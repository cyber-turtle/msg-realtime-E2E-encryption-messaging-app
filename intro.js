import React, { useState } from 'react';
import { Search, Menu, LogOut, User, MessageSquare, Lock, Settings, Send, UserPlus, Paperclip, Smile, Video, Phone } from 'lucide-react';

/**
 * MSG_Logo Component
 * Geometric Stealth Visor logo adapted for the light, minimal UI theme.
 */
const Logo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main Body - Solid Dark Gray (Tailwind gray-800) */}
    <path 
      d="M100 20 L170 60 V140 L100 180 L30 140 V60 L100 20Z" 
      fill="#1F2937" 
    />
    
    {/* The "M" Cutout / Visor - Solid Emerald-600 accent color */}
    <path 
      d="M60 85 L85 110 L100 95 L115 110 L140 85 V120 H120 V115 L100 135 L80 115 V120 H60 V85Z" 
      fill="#059669" // Emerald-600
    />
    
    {/* Hard Shadow for dimension - Subtle on light background */}
    <path 
      d="M100 180 L100 95 L60 85 V60 L30 60 V140 L100 180Z" 
      fill="black" 
      fillOpacity="0.1" 
    />
  </svg>
);

/**
 * Sidebar component containing the chat list.
 */
const ChatSidebar = ({ chats, selectedChat, setSelectedChat }) => {
    return (
        <div className="w-full md:w-[320px] bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
            
            {/* Header / App Title */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8" />
                    {/* Stylized text for 'speed' theme */}
                    <span className="font-extrabold text-xl tracking-widest text-gray-800 logo-text-speed">MSG</span>
                </div>
                <div className="flex gap-3 text-gray-500">
                    <button className="hover:text-emerald-600 transition" title="Add Contact"><UserPlus size={20} /></button>
                    <button className="hover:text-emerald-600 transition" title="Logout"><LogOut size={20} /></button>
                </div>
            </div>

            {/* Search Input for Chats */}
            <div className="p-4 border-b border-gray-100">
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {chats.map(chat => (
                    <div
                        key={chat.id}
                        // Style for selected chat item (light green background only)
                        className={`flex items-center p-4 cursor-pointer border-b border-gray-100 transition-colors ${selectedChat && selectedChat.id === chat.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setSelectedChat(chat)}
                    >
                        <div className={`w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center font-bold text-white text-sm mr-3 ${chat.unread > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                            {chat.name[0]}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-center">
                                <span className="font-semibold text-gray-800 truncate">{chat.name}</span>
                                <span className="text-xs text-gray-400">{chat.time}</span>
                            </div>
                            <p className="text-sm text-gray-500 truncate mt-0.5">{chat.lastMessage}</p>
                        </div>
                        {chat.unread > 0 && (
                            <span className="ml-3 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                {chat.unread}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer / User Settings */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white mr-3 text-sm">U</div>
                    <span className="font-medium text-sm text-gray-700">User Profile</span>
                </div>
                <button className="text-gray-500 hover:text-emerald-600 transition" title="Settings">
                    <Settings size={20} />
                </button>
            </div>
        </div>
    );
};

/**
 * Main chat panel component. Handles the selected chat view or the "Select a chat" message.
 */
const ChatMainPanel = ({ chat }) => {
    // Determine the content to display inside the main panel
    let content;

    if (!chat) {
        // Full screen "Select a chat" view, centered vertically and horizontally
        content = (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <MessageSquare size={48} className="text-emerald-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Select a chat to start messaging</h2>
                <p className="text-gray-500 text-sm flex items-center gap-1">
                    <Lock size={14} /> Your messages are end-to-end encrypted
                </p>
            </div>
        );
    } else {
        // Mock chat messages for demonstration
        const mockMessages = [
            { id: 1, text: "Hey, are we still meeting at 2 PM?", sender: 'other', time: '10:15 AM' },
            { id: 2, text: "Yes! Everything is set.", sender: 'me', time: '10:17 AM' },
            { id: 3, text: "Great. I'll send the file over in five minutes.", sender: 'other', time: '10:20 AM' },
        ];

        // Active chat view (Header, Messages, Input)
        content = (
            <>
                {/* Chat Header */}
                <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between shadow-sm">
                    
                    {/* Left side: Avatar and Name/Status */}
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center font-bold text-white text-md mr-3">{chat.name[0]}</div>
                        
                        <div className="flex flex-col">
                            <span className="text-lg font-semibold text-gray-800">{chat.name}</span>
                            {/* Online Indicator (No green dot) */}
                            <span className="text-xs text-emerald-500 font-medium">
                                Online
                            </span>
                        </div>
                    </div>
                    
                    {/* Right side: Call Icons and Menu (Borders removed) */}
                    <div className="flex gap-4 text-gray-500">
                        {/* Video Call Icon */}
                        <button 
                            className="hover:text-emerald-600 transition p-1" 
                            title="Video Call"
                        >
                            <Video size={20} />
                        </button>
                        {/* Voice Call Icon */}
                        <button 
                            className="hover:text-emerald-600 transition p-1" 
                            title="Voice Call"
                        >
                            <Phone size={20} />
                        </button>
                        {/* Menu */}
                        <button className="hover:text-emerald-600 transition p-1" title="Chat Menu">
                            <Menu size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages Area (Scrollable part) - The background is now on the parent container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {mockMessages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-xl shadow-sm ${msg.sender === 'me' 
                                ? 'bg-emerald-500 text-white rounded-br-none' 
                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'}`}
                            >
                                <p>{msg.text}</p>
                                <span className={`text-xs block mt-1 text-right ${msg.sender === 'me' ? 'text-emerald-200' : 'text-gray-400'}`}>{msg.time}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Footer with Attach Image and Emoji Icons */}
                <div className="p-4 bg-white border-t border-gray-200">
                    <div className="flex items-center gap-3">
                        {/* Attach Image Icon */}
                        <button className="text-gray-500 hover:text-emerald-600 transition p-2" title="Attach Image">
                            <Paperclip size={20} />
                        </button>
                        
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className="flex-1 p-3 text-sm rounded-full bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                        />
                        
                        {/* Emoji Icon */}
                        <button className="text-gray-500 hover:text-emerald-600 transition p-2" title="Emoji">
                            <Smile size={20} />
                        </button>

                        {/* Send Button */}
                        <button className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full transition-colors shadow-md">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // Main Panel Container: Always full height and width (flex-1)
    // Always apply chat-wallpaper here to ensure it covers the "Select a chat" screen too.
    return (
        <div className="flex-1 flex flex-col h-full chat-wallpaper">
            {content}
        </div>
    );
};


export default function ChatApp() {
    // Mock data for the sidebar
    const mockChats = [
        { id: 1, name: 'Alice Johnson', lastMessage: 'See you tomorrow!', time: '10:30 AM', unread: 2 },
        { id: 2, name: 'Bob Williams', lastMessage: 'Okay, I will check that.', time: 'Yesterday', unread: 0 },
        { id: 3, name: 'Team Project', lastMessage: 'Did everyone finish the report?', time: '3:05 PM', unread: 5 },
        { id: 4, name: 'Support', lastMessage: 'Your issue has been resolved.', time: '1 week ago', unread: 0 },
    ];

    // Set initial state to null so the "Select a chat" message is shown on load.
    const [selectedChat, setSelectedChat] = useState(null);

    return (
        <div className="h-screen w-screen overflow-hidden flex font-sans">
            {/* Sidebar - Hidden on mobile, fixed width on desktop */}
            <div className="hidden md:flex w-full md:w-[320px] h-full flex-shrink-0">
                <ChatSidebar 
                    chats={mockChats}
                    selectedChat={selectedChat}
                    setSelectedChat={setSelectedChat}
                />
            </div>
            
            {/* Main Panel */}
            <div className="flex-1 h-full">
                <ChatMainPanel chat={selectedChat} />
            </div>
            
            <style>{`
                /* Custom styling for the logo text (speed/digital look) */
                .logo-text-speed {
                    /* Skew the text forward for a sense of momentum (italic-like effect) */
                    transform: skewX(-8deg);
                    display: inline-block; /* Required for transform to work properly */
                    /* Motion blur/trailing shadow using the emerald accent color */
                    text-shadow: 
                        -0.5px 0 0 rgba(5, 150, 105, 0.4), 
                        -1.5px 0 0 rgba(5, 150, 105, 0.2); 
                }
                
                /* Custom CSS for the detailed, light-themed chat wallpaper (doodle-like texture) */
                .chat-wallpaper {
                    background-color: #f0f4f7; /* Very light blue-gray background */
                    /* Doodle pattern using faint gray stroke color for visibility */
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cdefs%3E%3Cstyle%3E .doodle-line { stroke: %23e5e7eb; stroke-width: 1.5; fill: none; stroke-opacity: 0.8; } %3C/style%3E%3C/defs%3E%3Cpath class='doodle-line' d='M20 20 H380 V380 H20 Z'/%3E%3Ccircle class='doodle-line' cx='100' cy='100' r='50'/%3E%3Cpath class='doodle-line' d='M250 50 C280 20, 350 20, 380 50'/%3E%3Cpath class='doodle-line' d='M50 250 L80 220 L110 250'/%3E%3Cpath class='doodle-line' d='M300 300 Q330 270, 360 300'/%3E%3Ccircle class='doodle-line' cx='200' cy='200' r='8'/%3E%3Crect class='doodle-line' x='150' y='320' width='100' height='30' rx='5'/%3E%3Cpath class='doodle-line' d='M30 350 L70 350 L70 380'/%3E%3Cpath class='doodle-line' d='M320 150 C350 120, 350 180, 320 210'/%3E%3Cpath class='doodle-line' d='M20 150 Q50 120, 80 150'/%3E%3Cpath class='doodle-line' d='M150 270 L180 300 L210 270 Z'/%3E%3Cpath class='doodle-line' d='M100 30 C130 5, 170 5, 200 30'/%3E%3Ccircle class='doodle-line' cx='350' cy='350' r='10'/%3E%3C/svg%3E");
                    background-repeat: repeat;
                    background-size: 150px 150px; /* Adjust size for a denser look */
                }
            `}</style>
        </div>
    );
}