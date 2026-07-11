import { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Recipe Storage — a personal recipe box                             */
/*  Design: kitchen-pantry palette (sage, deep green ink, tomato,     */
/*  butter). Recipe cards read like index cards with a colored tab.   */
/* ------------------------------------------------------------------ */

const C = {
  bg: "#EEF1EA",
  ink: "#26382B",
  inkSoft: "#5A6B5D",
  card: "#FFFDF8",
  line: "#D8DDD2",
  tomato: "#C4452C",
  butter: "#E9B44C",
  sage: "#7E9271",
};

const MEALS = ["Breakfast", "Lunch", "Dinner"];
const TAB_COLORS = { Breakfast: C.butter, Lunch: C.sage, Dinner: C.tomato };

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ---------- storage helpers ---------- */
async function loadRecipes() {
  try {
    const listed = await window.storage.list("recipe:");
    const keys = listed?.keys || [];
    const out = [];
    for (const k of keys) {
      try {
        const r = await window.storage.get(k);
        if (r?.value) out.push(JSON.parse(r.value));
      } catch (e) {
        /* skip broken entry */
      }
    }
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return out;
  } catch (e) {
    return [];
  }
}
async function saveRecipe(recipe) {
  try {
    await window.storage.set("recipe:" + recipe.id, JSON.stringify(recipe));
    return true;
  } catch (e) {
    return false;
  }
}
async function removeRecipe(id) {
  try {
    await window.storage.delete("recipe:" + id);
  } catch (e) {
    /* already gone */
  }
}

/* ---------- image compression ---------- */
function fileToCompressedDataUrl(file, maxDim = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- tiny UI atoms ---------- */
function Star({ filled, onClick, size = 22 }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={filled ? "Remove from favorites" : "Add to favorites"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
        lineHeight: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.7l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z"
          fill={filled ? C.butter : "none"}
          stroke={filled ? "#B8860B" : C.inkSoft}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function BackButton({ onClick, label = "Back" }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "fixed",
        left: 20,
        bottom: 20,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px 10px 14px",
        borderRadius: 999,
        border: `1.5px solid ${C.ink}`,
        background: C.card,
        color: C.ink,
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(38,56,43,0.15)",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>←</span> {label}
    </button>
  );
}

/* ---------- main app ---------- */
export default function RecipeStorage() {
  const [view, setView] = useState("home"); // home | recipes | favorites
  const [tab, setTab] = useState("Breakfast");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [openRecipe, setOpenRecipe] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    loadRecipes().then((r) => {
      if (alive) {
        setRecipes(r);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2400);
  };

  const addRecipe = async (recipe) => {
    setRecipes((prev) => [recipe, ...prev]);
    setShowForm(false);
    const ok = await saveRecipe(recipe);
    flash(ok ? `Saved “${recipe.name}”` : "Saved for this session — storage unavailable");
  };

  const toggleFavorite = async (id) => {
    let updated;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, favorite: !r.favorite };
        return updated;
      })
    );
    if (openRecipe?.id === id) setOpenRecipe((o) => ({ ...o, favorite: !o.favorite }));
    if (updated) await saveRecipe(updated);
  };

  const deleteRecipe = async (id) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setOpenRecipe(null);
    await removeRecipe(id);
    flash("Recipe deleted");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.ink,
        fontFamily: "'Avenir Next','Segoe UI',system-ui,sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&display=swap');
        .display { font-family: 'Fraunces', Georgia, serif; }
        button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible {
          outline: 3px solid ${C.butter}; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        .card-hover { transition: transform .15s ease, box-shadow .15s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(38,56,43,.16); }
      `}</style>

      {view === "home" && <Home go={setView} count={recipes.length} favCount={recipes.filter((r) => r.favorite).length} />}

      {view === "recipes" && (
        <RecipeList
          title="Recipes"
          recipes={recipes}
          loading={loading}
          tab={tab}
          setTab={setTab}
          onOpen={setOpenRecipe}
          onStar={toggleFavorite}
          onAdd={() => setShowForm(true)}
          goHome={() => setView("home")}
          goFavorites={() => setView("favorites")}
          showTabs
        />
      )}

      {view === "favorites" && (
        <RecipeList
          title="Favorites"
          recipes={recipes.filter((r) => r.favorite)}
          loading={loading}
          onOpen={setOpenRecipe}
          onStar={toggleFavorite}
          onAdd={() => setShowForm(true)}
          goHome={() => setView("home")}
          goRecipes={() => setView("recipes")}
        />
      )}

      {showForm && <RecipeForm onCancel={() => setShowForm(false)} onSave={addRecipe} />}

      {openRecipe && (
        <RecipeDetail
          recipe={recipes.find((r) => r.id === openRecipe.id) || openRecipe}
          onClose={() => setOpenRecipe(null)}
          onStar={() => toggleFavorite(openRecipe.id)}
          onDelete={() => deleteRecipe(openRecipe.id)}
        />
      )}

      {notice && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            left: "50%",
            transform: "translateX(-50%)",
            background: C.ink,
            color: C.card,
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 14,
            zIndex: 90,
            boxShadow: "0 4px 14px rgba(0,0,0,.25)",
          }}
        >
          {notice}
        </div>
      )}
    </div>
  );
}

/* ---------- title screen ---------- */
function Home({ go, count, favCount }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: "0.25em", textTransform: "uppercase", color: C.inkSoft, marginBottom: 10 }}>
        Your personal recipe box
      </div>
      <h1 className="display" style={{ fontSize: "clamp(40px, 8vw, 72px)", fontWeight: 700, margin: "0 0 40px", lineHeight: 1.05 }}>
        Recipe Storage
      </h1>

      {/* circular "dinner plate" button */}
      <button
        onClick={() => go("recipes")}
        className="card-hover"
        aria-label="Open recipes"
        style={{
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: C.card,
          border: `2px solid ${C.ink}`,
          boxShadow: `0 0 0 10px ${C.bg}, 0 0 0 12px ${C.line}, 0 10px 26px rgba(38,56,43,.18)`,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        <span className="display" style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>Recipes</span>
        <span style={{ fontSize: 12, color: C.inkSoft }}>{count} saved</span>
      </button>

      <button
        onClick={() => go("favorites")}
        style={{
          marginTop: 44,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "none",
          border: `1.5px solid ${C.line}`,
          borderRadius: 999,
          padding: "10px 22px",
          fontSize: 15,
          fontWeight: 600,
          color: C.ink,
          cursor: "pointer",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.7 1.2 6.6L12 17.7l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" fill={C.butter} stroke="#B8860B" strokeWidth="1.4" />
        </svg>
        Favorites {favCount > 0 ? `(${favCount})` : ""}
      </button>
    </div>
  );
}

/* ---------- list pages (Recipes / Favorites) ---------- */
function RecipeList({ title, recipes, loading, tab, setTab, onOpen, onStar, onAdd, goHome, goFavorites, goRecipes, showTabs }) {
  const visible = showTabs
    ? recipes.filter((r) => r.type === tab || !r.type) // unclassified recipes appear in every tab
    : recipes;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 110 }}>
      {/* top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: C.ink,
          color: C.card,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2 className="display" style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{title}</h2>
        {goFavorites && (
          <button onClick={goFavorites} style={topLinkStyle}>★ Favorites</button>
        )}
        {goRecipes && (
          <button onClick={goRecipes} style={topLinkStyle}>All recipes</button>
        )}
      </header>

      {/* meal tabs */}
      {showTabs && (
        <nav style={{ display: "flex", gap: 8, padding: "14px 20px 0", maxWidth: 980, margin: "0 auto" }} aria-label="Meal type">
          {MEALS.map((m) => {
            const active = tab === m;
            return (
              <button
                key={m}
                onClick={() => setTab(m)}
                style={{
                  flex: 1,
                  padding: "10px 0 9px",
                  borderRadius: "10px 10px 0 0",
                  border: `1.5px solid ${active ? C.ink : C.line}`,
                  borderBottom: active ? `3px solid ${TAB_COLORS[m]}` : `1.5px solid ${C.line}`,
                  background: active ? C.card : "transparent",
                  color: active ? C.ink : C.inkSoft,
                  fontWeight: active ? 700 : 500,
                  fontSize: 15,
                  cursor: "pointer",
                }}
                aria-pressed={active}
              >
                {m}
              </button>
            );
          })}
        </nav>
      )}

      {/* cards */}
      <main style={{ maxWidth: 980, margin: "0 auto", padding: "22px 20px" }}>
        {loading ? (
          <p style={{ color: C.inkSoft, textAlign: "center", marginTop: 60 }}>Loading your recipe box…</p>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: 70, color: C.inkSoft }}>
            <p className="display" style={{ fontSize: 22, color: C.ink, marginBottom: 8 }}>
              {title === "Favorites" ? "No favorites yet" : `No ${showTabs ? tab.toLowerCase() : ""} recipes yet`}
            </p>
            <p style={{ margin: 0 }}>
              {title === "Favorites"
                ? "Tap the star on any recipe to keep it here."
                : "Use the + button to add your first recipe."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
            {visible.map((r) => (
              <RecipeCard key={r.id} r={r} onOpen={() => onOpen(r)} onStar={() => onStar(r.id)} />
            ))}
          </div>
        )}
      </main>

      <BackButton onClick={goHome} />

      {/* add recipe FAB */}
      <button
        onClick={onAdd}
        aria-label="Add recipe"
        className="card-hover"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 40,
          width: 62,
          height: 62,
          borderRadius: "50%",
          background: C.tomato,
          color: "#fff",
          border: "none",
          fontSize: 32,
          lineHeight: 1,
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(196,69,44,.4)",
        }}
      >
        +
      </button>
    </div>
  );
}

const topLinkStyle = {
  background: "rgba(255,255,255,.12)",
  border: "1px solid rgba(255,255,255,.3)",
  color: "#FFFDF8",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

/* ---------- index-card style recipe card ---------- */
function RecipeCard({ r, onOpen, onStar }) {
  return (
    <div
      className="card-hover"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}
      style={{
        background: C.card,
        border: `1.5px solid ${C.line}`,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        position: "relative",
        boxShadow: "0 2px 6px rgba(38,56,43,.08)",
      }}
    >
      {/* meal-type tab */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 0,
          background: TAB_COLORS[r.type] || C.line,
          color: r.type === "Breakfast" ? C.ink : "#fff",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          padding: "4px 10px 4px 12px",
          borderRadius: "0 999px 999px 0",
          zIndex: 2,
        }}
      >
        {r.type || "Any meal"}
      </div>

      {r.image ? (
        <img src={r.image} alt={r.name} style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
      ) : (
        <div
          style={{
            width: "100%",
            height: 150,
            background: `repeating-linear-gradient(0deg, ${C.card}, ${C.card} 22px, ${C.line} 23px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
          }}
          aria-hidden="true"
        >
          🍽️
        </div>
      )}

      <div style={{ padding: "12px 14px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div className="display" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>{r.name}</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>
            {(r.ingredients?.length || 0)} ingredient{r.ingredients?.length === 1 ? "" : "s"} · {(r.steps?.length || 0)} step{r.steps?.length === 1 ? "" : "s"}
          </div>
        </div>
        <Star filled={!!r.favorite} onClick={onStar} />
      </div>
    </div>
  );
}

/* ---------- add-recipe form ---------- */
function RecipeForm({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [image, setImage] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    setError("");
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      setImage(dataUrl);
    } catch (err) {
      setError("That image couldn't be read. Try a different file.");
    }
    setImgBusy(false);
  };

  const submit = () => {
    if (!name.trim()) {
      setError("Give the recipe a name to save it.");
      return;
    }
    const ing = ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
    const stp = steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (ing.length === 0) {
      setError("Add at least one ingredient (one per line).");
      return;
    }
    if (stp.length === 0) {
      setError("Add at least one step (one per line).");
      return;
    }
    onSave({
      id: uid(),
      name: name.trim(),
      type: type || "",
      ingredients: ing,
      steps: stp,
      image,
      favorite: false,
      createdAt: Date.now(),
    });
  };

  return (
    <Overlay onClose={onCancel}>
      <h3 className="display" style={{ margin: "0 0 18px", fontSize: 26 }}>Add a recipe</h3>

      <Field label="Recipe name *">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sunday pancakes" style={inputStyle} />
      </Field>

      <Field label="Type" hint="Optional — pick a meal to file it under a tab. Left blank, it shows in all tabs.">
        <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
          <option value="">No type — show everywhere</option>
          {MEALS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </Field>

      <Field label="Ingredients *" hint="One ingredient per line.">
        <textarea
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
          rows={5}
          placeholder={"2 cups flour\n1 tbsp sugar\n2 eggs"}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      <Field label="Steps *" hint="One step per line — they'll be numbered automatically.">
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          rows={5}
          placeholder={"Whisk the dry ingredients\nFold in the eggs and milk\nCook 2–3 min per side"}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      <Field label="Photo" hint="Optional — show what the finished dish should look like.">
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
        {image ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src={image} alt="Recipe preview" style={{ width: 110, height: 80, objectFit: "cover", borderRadius: 8, border: `1.5px solid ${C.line}` }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button onClick={() => fileRef.current?.click()} style={smallBtn}>Replace photo</button>
              <button onClick={() => setImage(null)} style={{ ...smallBtn, color: C.tomato, borderColor: C.tomato }}>Remove photo</button>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={imgBusy} style={{ ...smallBtn, padding: "12px 18px" }}>
            {imgBusy ? "Processing…" : "＋ Add a photo"}
          </button>
        )}
      </Field>

      {error && <p style={{ color: C.tomato, fontSize: 14, margin: "4px 0 0" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ ...smallBtn, padding: "12px 22px" }}>Cancel</button>
        <button
          onClick={submit}
          style={{
            padding: "12px 26px",
            borderRadius: 999,
            border: "none",
            background: C.ink,
            color: C.card,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Save recipe
        </button>
      </div>
    </Overlay>
  );
}

/* ---------- recipe detail ---------- */
function RecipeDetail({ recipe, onClose, onStar, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: TAB_COLORS[recipe.type] ? C.inkSoft : C.inkSoft }}>
            {recipe.type || "Any meal"}
          </div>
          <h3 className="display" style={{ margin: "4px 0 0", fontSize: 28, lineHeight: 1.15 }}>{recipe.name}</h3>
        </div>
        <Star filled={!!recipe.favorite} onClick={onStar} size={28} />
      </div>

      {recipe.image && (
        <img
          src={recipe.image}
          alt={`${recipe.name} — finished dish`}
          style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 12, margin: "16px 0 4px", border: `1.5px solid ${C.line}` }}
        />
      )}

      <h4 style={sectionHead}>Ingredients</h4>
      <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.8, fontSize: 15.5 }}>
        {recipe.ingredients?.map((ing, i) => <li key={i}>{ing}</li>)}
      </ul>

      <h4 style={sectionHead}>Steps</h4>
      <ol style={{ margin: 0, paddingLeft: 24, lineHeight: 1.8, fontSize: 15.5 }}>
        {recipe.steps?.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s}</li>)}
      </ol>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 26, gap: 10, flexWrap: "wrap" }}>
        {confirming ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: C.inkSoft }}>Delete this recipe?</span>
            <button onClick={onDelete} style={{ ...smallBtn, background: C.tomato, color: "#fff", borderColor: C.tomato }}>Yes, delete</button>
            <button onClick={() => setConfirming(false)} style={smallBtn}>Keep it</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} style={{ ...smallBtn, color: C.tomato, borderColor: C.tomato }}>Delete recipe</button>
        )}
        <button onClick={onClose} style={{ ...smallBtn, background: C.ink, color: C.card, borderColor: C.ink, padding: "10px 24px" }}>Close</button>
      </div>
    </Overlay>
  );
}

/* ---------- shared bits ---------- */
function Overlay({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(38,56,43,.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "5vh 16px 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: C.card,
          borderRadius: 16,
          border: `1.5px solid ${C.line}`,
          padding: "26px 26px 24px",
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 16px 44px rgba(0,0,0,.28)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  borderRadius: 10,
  border: `1.5px solid ${C.line}`,
  background: "#fff",
  fontSize: 15,
  color: C.ink,
  fontFamily: "inherit",
};

const smallBtn = {
  padding: "9px 16px",
  borderRadius: 999,
  border: `1.5px solid ${C.line}`,
  background: C.card,
  color: C.ink,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const sectionHead = {
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.inkSoft,
  margin: "24px 0 8px",
  borderBottom: `1.5px solid ${C.line}`,
  paddingBottom: 6,
};
