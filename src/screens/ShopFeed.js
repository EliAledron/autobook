import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, updateDoc, doc, orderBy, arrayUnion, arrayRemove, deleteDoc, getDoc, serverTimestamp, where } from "firebase/firestore";
import { sh, colors, getInitials, EmptyState } from "./dashboardShared";
import CarLoader from "./CarLoader";

const CLOUDINARY_CLOUD = "dpwojan8w";
const CLOUDINARY_PRESET = "autobook_uploads";

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Upload failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

function timeAgo(timestamp) {
  if (!timestamp) return "Just now";
  let ts;
  if (timestamp.toDate) ts = timestamp.toDate().getTime();
  else if (timestamp.seconds) ts = timestamp.seconds * 1000;
  else if (typeof timestamp === 'number') ts = timestamp;
  else ts = new Date(timestamp).getTime();

  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ShopFeed() {
  const navigate = useNavigate();
  const [uid, setUid] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [shops, setShops] = useState([]);
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit post states
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { navigate("/login"); return; }
      setUid(u.uid);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setCurrentUser(snap.data());
      } catch (e) {}
      await Promise.all([loadPosts(), loadShops()]);
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const loadShops = async () => {
    try {
      const snap = await getDocs(collection(db, "shops"));
      let shopsData = snap.docs.map((d) => {
        const shop = { id: d.id, ...d.data() };
        const sName = (shop.name || "").toUpperCase();
        
        if (sName.includes("JME")) shop.id = "JME";
        else if (sName.includes("GRHE")) shop.id = "GRHE";

        return shop;
      });
      shopsData = Array.from(new Map(shopsData.map(s => [s.id, s])).values());
      setShops(shopsData);

      try {
        const shopsWithRatings = await Promise.all(shopsData.map(async (shop) => {
          try {
            const bQuery = query(collection(db, "bookings"), where("shopId", "==", shop.id));
            const bSnap = await getDocs(bQuery);
            let ratedBookings = bSnap.docs.map(d => d.data()).filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0);
            if (ratedBookings.length === 0 && shop.name) {
              const nQuery = query(collection(db, "bookings"), where("shopName", "==", shop.name));
              const nSnap = await getDocs(nQuery);
              ratedBookings = nSnap.docs.map(d => d.data()).filter(b => b.rating && !isNaN(Number(b.rating)) && Number(b.rating) > 0);
            }
            if (ratedBookings.length > 0) {
              const avg = ratedBookings.reduce((sum, b) => sum + Number(b.rating), 0) / ratedBookings.length;
              return { ...shop, rating: avg, reviews: ratedBookings.length };
            }
          } catch(e) {}
          return shop;
        }));
        setShops(shopsWithRatings);
      } catch(err) { console.error(err); }
    } catch (e) {
      console.error("Failed to load shops:", e);
    }
  };

  const loadPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Fallback if index isn't ready
      try {
        const snap2 = await getDocs(collection(db, "posts"));
        const sorted = snap2.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setPosts(sorted);
      } catch (e2) {
        setPosts([]);
      }
    }
  };

  const toggleLike = async (post) => {
    if (!uid) return;
    const hasLiked = post.likes?.includes(uid);
    
    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          likes: hasLiked ? p.likes.filter(id => id !== uid) : [...(p.likes || []), uid]
        };
      }
      return p;
    }));

    try {
      await updateDoc(doc(db, "posts", post.id), {
        likes: hasLiked ? arrayRemove(uid) : arrayUnion(uid)
      });
    } catch (e) {
      // Revert if failed
      console.error("Failed to like post:", e);
      await loadPosts();
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) {
      console.error("Failed to delete post:", e);
    }
  };

  const openEditModal = (post) => {
    setEditingPost(post);
    setEditContent(post.content || "");
    setEditImageFile(null);
    setEditImagePreview(post.imageUrl || null);
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingPost(null);
    setEditContent("");
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditError("");
  };

  const submitEditPost = async () => {
    if (!editContent.trim() && !editImagePreview) {
      setEditError("Post cannot be empty.");
      return;
    }
    setSavingEdit(true);
    setEditError("");

    try {
      let finalImageUrl = editingPost.imageUrl || null;
      if (editImageFile) {
        finalImageUrl = await uploadToCloudinary(editImageFile);
      } else if (!editImagePreview) {
        finalImageUrl = null;
      }

      const updates = { content: editContent.trim(), imageUrl: finalImageUrl, updatedAt: serverTimestamp() };
      await updateDoc(doc(db, "posts", editingPost.id), updates);
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...updates } : p));
      closeEditModal();
    } catch (err) {
      setEditError(err.message || "Failed to edit post.");
    }
    setSavingEdit(false);
  };

  const role = currentUser?.role?.toLowerCase();

  // Filter posts based on the search input
  const filteredPosts = posts.filter((post) => {
    const s = search.toLowerCase();
    const matchSearch = (post.content || "").toLowerCase().includes(s) || (post.shopName || "").toLowerCase().includes(s);
    
    const shopObj = shops.find(shop => shop.id === post.shopId || (shop.ownerId && shop.ownerId === post.ownerId) || (shop.name && shop.name === post.shopName) || (shop.shortName && shop.shortName === post.shopName));
    const shopRating = shopObj?.rating && !isNaN(Number(shopObj.rating)) && Number(shopObj.rating) > 0 ? Number(shopObj.rating) : 0;
    const matchRating = shopRating >= minRating;
    return matchSearch && matchRating;
  });

  return (
    <div style={sh.page}>
      <style>
        {`
          @keyframes ab-fade-in { from { opacity: 0; } to { opacity: 1; } }
          @keyframes ab-slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        `}
      </style>

      {/* TOPBAR */}
      <div style={sh.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: colors.accent, fontSize: "18px", cursor: "pointer", padding: 0 }}>←</button>
          <div style={sh.topbarLogo}>Auto<span style={sh.topbarAccent}>Book</span></div>
        </div>
      </div>

      {/* HERO */}
      <div style={sh.hero}>
        <div style={sh.rolePill}><div style={sh.roleDot} /><span style={sh.roleText}>Community</span></div>
        <div style={sh.heroGreeting}>Shop Feed</div>
        <div style={sh.heroSub}>Discover promos, news, and updates from autoshops.</div>
      </div>

      <div style={sh.content}>
        {/* SEARCH & FILTER */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", color: colors.textMuted, pointerEvents: "none" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search by services, keywords, or shop name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "14px 40px",
                borderRadius: "24px", border: `1px solid transparent`,
                fontSize: "14px", backgroundColor: "#f1f5f9",
                color: colors.textPrimary, fontFamily: "inherit",
                boxSizing: "border-box", outline: "none",
                transition: "all 0.2s ease",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
              }}
              onFocus={(e) => { e.target.style.border = `1px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
              onBlur={(e) => { e.target.style.border = `1px solid transparent`; e.target.style.backgroundColor = "#f1f5f9"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "#e2e8f0", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            style={{
              padding: "14px 16px", borderRadius: "24px", border: `1px solid transparent`,
              fontSize: "13px", backgroundColor: "#f1f5f9", color: colors.textPrimary,
              fontFamily: "inherit", outline: "none", cursor: "pointer",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)", transition: "all 0.2s ease"
            }}
            onFocus={(e) => { e.target.style.border = `1px solid ${colors.blue}`; e.target.style.backgroundColor = colors.white; e.target.style.boxShadow = "0 4px 12px rgba(42,82,152,0.1)"; }}
            onBlur={(e) => { e.target.style.border = `1px solid transparent`; e.target.style.backgroundColor = "#f1f5f9"; e.target.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)"; }}
          >
            <option value={0}>All Ratings</option>
            <option value={4.5}>4.5+ Stars</option>
            <option value={4.0}>4.0+ Stars</option>
            <option value={3.0}>3.0+ Stars</option>
          </select>
        </div>

        {loading ? (
          <CarLoader text="Loading feed" />
        ) : filteredPosts.length === 0 ? (
          <EmptyState
            icon="📰"
            title={search || minRating > 0 ? "No matching posts found" : "No posts yet"}
            subtitle={search || minRating > 0 ? "Try adjusting your search or rating filter." : "Check back later for shop announcements and promos!"}
          />
        ) : (
          filteredPosts.map(post => {
            const hasLiked = post.likes?.includes(uid);
            const shopObj = shops.find(s => s.id === post.shopId || (s.ownerId && s.ownerId === post.ownerId) || (s.name && s.name === post.shopName) || (s.shortName && s.shortName === post.shopName));
            const targetShop = shopObj || { id: post.shopId || post.ownerId, name: post.shopName || "Shop", ownerId: post.ownerId };
            return (
              <div key={post.id} style={{ background: colors.white, borderRadius: "20px", padding: "20px", marginBottom: "1rem", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: `1px solid ${colors.border}` }}>
                
                {/* Header: Shop Info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                  <div 
                    style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", transition: "opacity 0.2s" }}
                    onClick={() => navigate("/customer/shop-profile", { state: { shop: targetShop } })}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = 0.8; }}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 1}
                    title={`View ${post.shopName || 'Shop'}'s profile`}
                  >
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: targetShop.logoURL ? `url(${targetShop.logoURL}) center/cover` : targetShop.bg || colors.infoBg, color: targetShop.accent || colors.info, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800", flexShrink: 0, border: `1px solid ${colors.border}` }}>
                      {!targetShop.logoURL && (targetShop.icon || getInitials(post.shopName || "Shop"))}
                    </div>
                    <div>
                      <div style={{ fontWeight: "800", fontSize: "15px", color: colors.textPrimary }}>
                        {post.shopName || "Shop Name"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                        <span style={{ fontSize: "11px", color: colors.textMuted, fontWeight: "600" }}>{timeAgo(post.createdAt)}</span>
                        <span style={{ fontSize: "10px", color: colors.border }}>•</span>
                        <span style={{ color: "#f59e0b", fontSize: "11px" }}>★</span>
                        <span style={{ fontSize: "11px", color: colors.textSecondary, fontWeight: "700" }}>
                          {targetShop.rating && !isNaN(Number(targetShop.rating)) && Number(targetShop.rating) > 0 ? Number(targetShop.rating).toFixed(1) : "New"}
                        </span>
                        {targetShop.reviews > 0 && (
                          <span style={{ fontSize: "10px", color: colors.textMuted }}>({targetShop.reviews})</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {((currentUser?.shopId && currentUser.shopId === post.shopId) || post.ownerId === uid) && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => openEditModal(post)} style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", fontSize: "16px", padding: "4px" }} title="Edit Post">
                        ✏️
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} style={{ background: "none", border: "none", color: colors.textMuted, cursor: "pointer", fontSize: "16px", padding: "4px" }} title="Delete Post">
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: "1.6", marginBottom: "16px", whiteSpace: "pre-wrap" }}>
                  {post.content}
                </div>

                {post.imageUrl && (
                  <div style={{ marginBottom: "16px", borderRadius: "12px", overflow: "hidden", border: `1px solid ${colors.border}`, background: colors.bg }}>
                    <img src={post.imageUrl} alt="Post attachment" style={{ width: "100%", height: "auto", maxHeight: "400px", objectFit: "contain", display: "block" }} />
                  </div>
                )}

                {/* Actions */}
                <div style={{ borderTop: `1px solid ${colors.bg}`, paddingTop: "12px", display: "flex", alignItems: "center" }}>
                  <button 
                    onClick={() => toggleLike(post)} 
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: hasLiked ? colors.danger : colors.textSecondary, fontSize: "13px", fontWeight: "700", padding: 0, transition: "color 0.2s" }}
                  >
                    <span style={{ fontSize: "18px", transition: "transform 0.2s", transform: hasLiked ? "scale(1.1)" : "scale(1)" }}>
                      {hasLiked ? "❤️" : "🤍"}
                    </span> 
                    {post.likes?.length || 0}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT POST MODAL */}
      {editingPost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,38,64,0.6)", backdropFilter: "blur(6px)", zIndex: 110, display: "flex", alignItems: "flex-end", animation: "ab-fade-in 0.2s ease-out" }} onClick={closeEditModal}>
          <div style={{ background: colors.white, borderRadius: "28px 28px 0 0", width: "100%", padding: "2rem 1.5rem", maxHeight: "90vh", overflowY: "auto", animation: "ab-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 -4px 24px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "800", fontSize: "18px", color: colors.navy }}>✏️ Edit Post</div>
              <button onClick={closeEditModal} style={{ background: colors.bg, border: "none", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", cursor: "pointer", color: colors.textSecondary }}>×</button>
            </div>

            {editError && (
              <div style={{ background: colors.dangerBg, border: `1px solid ${colors.danger}`, borderRadius: "12px", padding: "10px 14px", fontSize: "13px", color: colors.danger, marginBottom: "1rem", fontWeight: "600" }}>
                ❌ {editError}
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "12px", color: colors.textSecondary, fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Post Content</div>
              <textarea style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: `1.5px solid ${colors.border}`, fontSize: "14px", background: "#f9fafb", color: colors.textPrimary, fontFamily: "inherit", boxSizing: "border-box", outline: "none", minHeight: "100px", resize: "vertical" }} placeholder="What's new? Share promos, available services, or shop updates..." value={editContent} onChange={e => setEditContent(e.target.value)} />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <input type="file" id="editImageUpload" accept="image/*" style={{ display: "none" }} onChange={(e) => { const file = e.target.files[0]; if (file) { setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file)); } }} />
              {editImagePreview ? (
                <div style={{ position: "relative", width: "100%", borderRadius: "14px", overflow: "hidden", border: `1.5px solid ${colors.border}`, background: colors.bg }}>
                  <img src={editImagePreview} alt="Preview" style={{ width: "100%", height: "auto", maxHeight: "250px", objectFit: "contain", display: "block" }} />
                  <button onClick={() => { setEditImageFile(null); setEditImagePreview(null); }} style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "16px" }}>×</button>
                </div>
              ) : (
                <button onClick={() => document.getElementById("editImageUpload").click()} style={{ width: "100%", padding: "14px", borderRadius: "14px", border: `1.5px dashed ${colors.border}`, background: colors.bg, color: colors.textSecondary, fontSize: "14px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span style={{ fontSize: "18px" }}>📷</span> Add Photo (optional)</button>
              )}
            </div>

            <button onClick={submitEditPost} disabled={savingEdit || (!editContent.trim() && !editImagePreview)} style={{ ...sh.primaryBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", opacity: savingEdit || (!editContent.trim() && !editImagePreview) ? 0.6 : 1 }}>
              {savingEdit ? "Saving changes..." : "Save Changes"}
            </button>
            <div style={{ height: "12px" }} />
            <button onClick={closeEditModal} style={{ ...sh.outlineBtn, padding: "16px", borderRadius: "16px", fontSize: "15px", border: "none", background: colors.bg, color: colors.textSecondary, fontWeight: "700" }}>Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
}