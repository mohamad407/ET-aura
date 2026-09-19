import React, { useEffect, useState } from "react";

import { createRoot } from "react-dom/client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut
} from "firebase/auth";

import { auth } from "./firebase";

import "./style.css";



const API = "https://et-aura-32o8.onrender.com";


const navItems = [

  { id: "dashboard", label: "Dashboard", icon: "◉" },

  { id: "orders", label: "Orders", icon: "▣" },

  { id: "prediction", label: "Prediction", icon: "⌁" },

  { id: "analytics", label: "Analytics", icon: "◌" },

  { id: "model", label: "Model Performance", icon: "▥" }

];



const defaultForm = {

  restaurant: "Demo Kitchen",

  distance_km: 3,

  prep_time: 15,

  active_orders: 4,

  available_riders: 5,

  traffic: "Medium",

  weather: "Clear",

  demand: "Medium",

  time_hour: 19

};



async function api(path, options = {}) {

  const response = await fetch(`${API}${path}`, {

    headers: {

      "Content-Type": "application/json",

      ...(options.headers || {})

    },

    ...options

  });



  if (!response.ok) {

    const text = await response.text();

   throw new Error(text || `Request failed: ${response.status}`);

  }



  return response.json();

}



function riskClass(risk) {

  return String(risk || "").toLowerCase();

}



function RiskBadge({ risk }) {

  return (

    <span className={`risk ${riskClass(risk)}`}>

      {risk || "UNKNOWN"}

    </span>

  );

}



function Card({ title, value, sub }) {

  return (

    <div className="card">

      <div className="card-title">{title}</div>

      <div className="card-value">{value}</div>

      {sub && <div className="card-sub">{sub}</div>}

    </div>

  );

}



function EmptyState({ text }) {

  return (

    <div className="empty">

      <div className="empty-icon">◌</div>

      <div>{text}</div>

    </div>

  );

}



function LoginSignupPage({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function getAuthErrorMessage(err) {
    switch (err?.code) {
      case "auth/email-already-in-use":
        return "An account already exists with this email.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/popup-blocked":
        return "The Google sign-in popup was blocked by the browser.";
      default:
        return err?.message || "Authentication failed. Please try again.";
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const credential = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      onLogin(credential.user);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      onLogin(credential.user);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-background"></div>
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">◉</div>
          <h1>ETAura</h1>
          <p>Predict delays before they happen.</p>
        </div>

        <div className="auth-toggle">
          <button
            type="button"
            className={`toggle-btn ${isSignUp ? "active" : ""}`}
            onClick={() => {
              setIsSignUp(true);
              setError("");
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            className={`toggle-btn ${!isSignUp ? "active" : ""}`}
            onClick={() => {
              setIsSignUp(false);
              setError("");
            }}
          >
            Sign In
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading || googleLoading}>
            {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="google-auth-btn"
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          <span className="google-icon">G</span>
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="auth-footer">
          <p>
            {isSignUp
              ? "Create your ETAura account with Firebase Authentication."
              : "Sign in securely with Firebase Authentication."}
          </p>
        </div>
      </div>
    </div>
  );
}

function App() {

  const [user, setUser] = useState(null);

  const [page, setPage] = useState("dashboard");

  const [orders, setOrders] = useState([]);

  const [summary, setSummary] = useState({

    total_orders: 0,

    high_risk_orders: 0,

    average_delay_probability: 0

  });

  const [riskData, setRiskData] = useState([]);

  const [metrics, setMetrics] = useState(null);

  const [form, setForm] = useState(defaultForm);

  const [prediction, setPrediction] = useState(null);

  const [loading, setLoading] = useState(false);

  const [simulating, setSimulating] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return () => unsubscribe();
  }, []);



  async function loadDashboard() {

    try {

      const [s, o, r, m] = await Promise.all([

        api("/api/dashboard/summary"),

        api("/api/dashboard/recent-orders"),

        api("/api/dashboard/risk-distribution"),

        api("/api/ml/metrics")

      ]);



      setSummary(s);

      setOrders(o || []);

      setRiskData(r || []);

      setMetrics(m);


      setError("");

    } catch (err) {


      setError("Backend unavailable. Ensure FastAPI is running on port 8000.");

    }

  }



  useEffect(() => {

    if (user) {

      loadDashboard();

      const timer = setInterval(loadDashboard, 5000);

      return () => clearInterval(timer);

    }

  }, [user]);



  function updateField(name, value) {

    setForm(prev => ({

      ...prev,

      [name]: value

    }));

  }



  async function predictETA(event) {

    event?.preventDefault();



    setLoading(true);

    setError("");



    try {

      const result = await api("/api/predict", {

        method: "POST",

        body: JSON.stringify({

          ...form,

          distance_km: Number(form.distance_km),

          prep_time: Number(form.prep_time),

          active_orders: Number(form.active_orders),

          available_riders: Number(form.available_riders),

          time_hour: Number(form.time_hour)

        })

      });



      setPrediction(result);

      await loadDashboard();

    } catch (err) {

      setError("Prediction failed. Check that FastAPI is running.");

    } finally {

      setLoading(false);

    }

  }



  function randomScenario() {

    const traffic = ["Low", "Medium", "High"];

    const weather = ["Clear", "Rain", "Storm"];

    const demand = ["Low", "Medium", "High"];



    return {

      restaurant: [

        "Demo Kitchen",

        "Urban Bites",

        "Spice Hub",

        "Fresh Bowl",

        "Metro Meals"

      ][Math.floor(Math.random() * 5)],

      distance_km: Number((1 + Math.random() * 10).toFixed(1)),

      prep_time: Math.floor(8 + Math.random() * 28),

      active_orders: Math.floor(Math.random() * 30),

      available_riders: Math.floor(1 + Math.random() * 10),

      traffic: traffic[Math.floor(Math.random() * traffic.length)],

      weather: weather[Math.floor(Math.random() * weather.length)],

      demand: demand[Math.floor(Math.random() * demand.length)],

      time_hour: Math.floor(9 + Math.random() * 13)

    };

  }



  async function simulateOrder() {

    setSimulating(true);

    setError("");



    try {

      const scenario = randomScenario();



      const result = await api("/api/predict", {

        method: "POST",

        body: JSON.stringify(scenario)

      });



      setPrediction(result);

      await loadDashboard();

      setPage("dashboard");

    } catch (err) {

      setError("Simulation failed. Check the FastAPI backend.");

    } finally {

      setSimulating(false);

    }

  }



  function navigate(target) {

    setPage(target);

    setError("");

  }



  async function logout() {
    try {
      await firebaseSignOut(auth);
      setPage("dashboard");
    } catch (err) {
      setError(err?.message || "Unable to sign out.");
    }
  }



  if (!user) {

    return <LoginSignupPage onLogin={setUser} />;

  }



  return (

    <div className="app">

      <aside className="sidebar">

        <div className="brand">

          <div className="brand-mark">◉</div>

          <div>

            <div className="brand-name">ETAura</div>

            <div className="brand-tagline">

              Predict delays before they happen.

            </div>

          </div>

        </div>



        <nav className="nav">

          {navItems.map(item => (

            <button

              key={item.id}

              className={`nav-item ${page === item.id ? "active" : ""}`}

              onClick={() => navigate(item.id)}

            >

              <span className="nav-icon">{item.icon}</span>

              <span>{item.label}</span>

            </button>

          ))}

        </nav>





        <div className="sidebar-footer">

          <div className="user-info">

            <div className="user-avatar">{(user.displayName || user.email || "U")[0].toUpperCase()}</div>

            <div>

              <div className="user-name">{user.displayName || user.email?.split("@")[0] || "User"}</div>

              <button className="logout-btn" onClick={logout}>Sign Out</button>

            </div>

          </div>

        </div>

      </aside>



      <main className="main">

        <header className="topbar">

          <div>

            <div className="eyebrow">ETA RELIABILITY ENGINE</div>

            <h1>

              {page === "dashboard" && "Operations Intelligence"}

              {page === "orders" && "Live Orders"}

              {page === "prediction" && "ETA Prediction"}

              {page === "analytics" && "Operational Analytics"}

              {page === "model" && "Model Performance"}

            </h1>

            <p>

              {page === "dashboard" &&

                "Monitor delivery conditions and identify delay risk early."}

              {page === "orders" &&

                "Review predictions generated by the ETAura engine."}

              {page === "prediction" &&

                "Run a model prediction using operational conditions."}

              {page === "analytics" &&

                "Explore risk and delivery patterns from prediction history."}

              {page === "model" &&

                "Evaluation results from the trained machine-learning models."}

            </p>

          </div>



          <button

            className="simulate-btn"

            onClick={simulateOrder}

            disabled={simulating}

          >

            {simulating ? "Simulating..." : "+ Simulate Order"}

          </button>

        </header>



        {error && (

          <div className="alert">

            <strong>Notice:</strong> {error}

          </div>

        )}



        {page === "dashboard" && (

          <DashboardPage

            summary={summary}

            orders={orders}

            riskData={riskData}

            metrics={metrics}

          />

        )}



        {page === "orders" && (

          <OrdersPage orders={orders} />

        )}



        {page === "prediction" && (

          <PredictionPage

            form={form}

            updateField={updateField}

            predictETA={predictETA}

            prediction={prediction}

            loading={loading}

          />

        )}



        {page === "analytics" && (

          <AnalyticsPage orders={orders} riskData={riskData} />

        )}



        {page === "model" && (

          <ModelPage metrics={metrics} />

        )}

      </main>

    </div>

  );

}



function DashboardPage({ summary, orders, riskData, metrics }) {

  return (

    <>

      <div className="cards">

        <Card title="Total Orders" value={summary.total_orders || 0} />

        <Card title="High Risk" value={summary.high_risk_orders || 0} />

        <Card

          title="Avg Delay Risk"

          value={`${((summary.average_delay_probability || 0) * 100).toFixed(1)}%`}

        />

        <Card title="Predictions" value={orders.length || 0} />

      </div>



      <div className="dashboard-grid">

        <section className="panel">

          <div className="panel-head">

            <div>

              <h2>Recent Predictions</h2>

              <p>Latest delivery ETAs and risk levels</p>

            </div>

          </div>



          {orders.length > 0 ? (

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>Restaurant</th>

                    <th>Distance</th>

                    <th>ETA</th>

                    <th>Risk</th>

                  </tr>

                </thead>

                <tbody>

                  {orders.slice(0, 8).map((order, idx) => (

                    <tr key={idx}>

                      <td>{order.restaurant || "—"}</td>

                      <td>{order.distance_km || "—"} km</td>

                      <td>{order.predicted_eta || "—"} min</td>

                      <td>

                        <RiskBadge risk={order.risk_level} />

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <EmptyState text="No predictions yet. Run a simulation to get started." />

          )}

        </section>



        <section className="panel">

          <div className="panel-head">

            <div>

              <h2>Risk Distribution</h2>

              <p>Current prediction breakdown</p>

            </div>

          </div>



          <RiskBars data={riskData} />



          {metrics && (

            <div className="model-mini">

              <div className="mini-title">Model Accuracy</div>

              <div className="metric-row">

                <span>Classification</span>

                <strong>{(metrics?.classification?.accuracy * 100 || 0).toFixed(1)}%</strong>

              </div>

              <div className="metric-row">

                <span>Precision</span>

                <strong>{(metrics?.classification?.precision * 100 || 0).toFixed(1)}%</strong>

              </div>

            </div>

          )}

        </section>

      </div>

    </>

  );

}



function OrdersPage({ orders }) {

  const [filter, setFilter] = useState("all");



  const filtered = orders.filter(order => {

    if (filter === "high") return order.risk_level === "HIGH";

    if (filter === "medium") return order.risk_level === "MEDIUM";

    if (filter === "low") return order.risk_level === "LOW";

    return true;

  });



  return (

    <div className="orders-container">

      <section className="panel">

        <div className="panel-head">

          <div>

            <h2>Live Orders</h2>

            <p>All predicted deliveries</p>

          </div>

          <div className="filter-buttons">

            {["all", "high", "medium", "low"].map(f => (

              <button

                key={f}

                className={`filter-btn ${filter === f ? "active" : ""}`}

                onClick={() => setFilter(f)}

              >

                {f.charAt(0).toUpperCase() + f.slice(1)}

              </button>

            ))}

          </div>

        </div>



        {filtered.length > 0 ? (

          <div className="orders-grid">

            {filtered.map((order, idx) => (

              <div key={idx} className="order-card">

                <div className="order-header">

                  <div>

                    <h3>{order.restaurant || "Unknown"}</h3>

                    <p className="order-time">{new Date().toLocaleTimeString()}</p>

                  </div>

                  <RiskBadge risk={order.risk_level} />

                </div>

                <div className="order-details">

                  <div className="detail-item">

                    <span>Distance</span>

                    <strong>{order.distance_km || "—"} km</strong>

                  </div>

                  <div className="detail-item">

                    <span>ETA</span>

                    <strong>{order.predicted_eta || "—"} min</strong>

                  </div>

                  <div className="detail-item">

                    <span>Traffic</span>

                    <strong>{order.traffic || "—"}</strong>

                  </div>

                  <div className="detail-item">

                    <span>Weather</span>

                    <strong>{order.weather || "—"}</strong>

                  </div>

                </div>

              </div>

            ))}

          </div>

        ) : (

          <EmptyState text="No orders match this filter." />

        )}

      </section>

    </div>

  );

}



function PredictionPage({ form, updateField, predictETA, prediction, loading }) {

  return (

    <div className="prediction-layout">

      <section className="panel">

        <div className="panel-head">

          <div>

            <h2>Run Prediction</h2>

            <p>Enter operational conditions</p>

          </div>

        </div>



        <form onSubmit={predictETA} className="prediction-form">

          <div className="form-grid">

            <Field

              label="Restaurant"

              value={form.restaurant}

              onChange={v => updateField("restaurant", v)}

            />

            <Field

              label="Distance (km)"

              type="number"

              value={form.distance_km}

              onChange={v => updateField("distance_km", v)}

            />

            <Field

              label="Prep Time (min)"

              type="number"

              value={form.prep_time}

              onChange={v => updateField("prep_time", v)}

            />

            <Field

              label="Active Orders"

              type="number"

              value={form.active_orders}

              onChange={v => updateField("active_orders", v)}

            />

            <Field

              label="Available Riders"

              type="number"

              value={form.available_riders}

              onChange={v => updateField("available_riders", v)}

            />

            <Field

              label="Hour (0-23)"

              type="number"

              value={form.time_hour}

              onChange={v => updateField("time_hour", v)}

            />

            <SelectField

              label="Traffic Level"

              value={form.traffic}

              options={["Low", "Medium", "High"]}

              onChange={v => updateField("traffic", v)}

            />

            <SelectField

              label="Weather"

              value={form.weather}

              options={["Clear", "Rain", "Storm"]}

              onChange={v => updateField("weather", v)}

            />

            <SelectField

              label="Demand"

              value={form.demand}

              options={["Low", "Medium", "High"]}

              onChange={v => updateField("demand", v)}

            />

          </div>



          <button type="submit" className="primary-btn form-action" disabled={loading}>

            {loading ? "Predicting..." : "Generate Prediction"}

          </button>

        </form>

      </section>



      <div className="prediction-output">

        {prediction ? (

          <PredictionResult prediction={prediction} />

        ) : (

          <EmptyState text="Enter details and predict an ETA" />

        )}

      </div>

    </div>

  );

}



function PredictionResult({ prediction }) {

  return (

    <section className="panel prediction-result">

      <div>

        <div className="result-label">Estimated Time of Arrival</div>

        <div className="big-eta">{prediction.predicted_eta || "—"} min</div>

        <div className="range">

          Range: {prediction.min_eta || "—"} - {prediction.max_eta || "—"} min

        </div>

      </div>



      <div className="result-stat">

        <span>Risk Level</span>

        <strong>

          <RiskBadge risk={prediction.risk_level} />

        </strong>

      </div>



      <div className="result-stat">

        <span>Delay Probability</span>

        <strong>

          {(prediction.delay_probability * 100 || 0).toFixed(1)}%

        </strong>

      </div>



      <div>

        <div className="result-label">Contributing Factors</div>

        <div className="factor-box">

          <div className="factor-list">

            {prediction.factors && prediction.factors.map((f, i) => (

              <span key={i}>{f}</span>

            ))}

          </div>

        </div>

      </div>

    </section>

  );

}



function AnalyticsPage({ orders, riskData }) {

  const traffic = ["Low", "Medium", "High"].map(level => {

    const rows = orders.filter(o => o.traffic === level);



    const avg = rows.length

      ? rows.reduce((sum, o) => sum + Number(o.predicted_eta || 0), 0) / rows.length

      : 0;



    return {

      level,

      count: rows.length,

      avg: Math.round(avg)

    };

  });



  return (

    <div className="analytics-grid">

      <section className="panel">

        <div className="panel-head">

          <div>

            <h2>Risk Distribution</h2>

            <p>Prediction history by risk level</p>

          </div>

        </div>



        <RiskBars data={riskData} large />

      </section>



      <section className="panel">

        <div className="panel-head">

          <div>

            <h2>ETA by Traffic</h2>

            <p>Average predicted ETA in recent records</p>

          </div>

        </div>



        <div className="bar-chart">

          {traffic.map(item => (

            <div className="bar-row" key={item.level}>

              <div className="bar-label">

                <span>{item.level}</span>

                <strong>{item.avg || "—"} min</strong>

              </div>

              <div className="bar-track">

                <div

                  className="bar-fill"

                  style={{

                    width: `${Math.min((item.avg / 120) * 100, 100)}%`

                  }}

                />

              </div>

            </div>

          ))}

        </div>

      </section>



      <section className="panel full-span">

        <div className="panel-head">

          <div>

            <h2>Operational Insights</h2>

            <p>Observed relationships in the current prediction records</p>

          </div>

        </div>



        <div className="insight-grid">

          <div className="insight">

            <span>Records analysed</span>

            <strong>{orders.length}</strong>

          </div>



          <div className="insight">

            <span>High-risk records</span>

            <strong>

              {orders.filter(o => o.risk_level === "HIGH").length}

            </strong>

          </div>



          <div className="insight">

            <span>Storm conditions</span>

            <strong>

              {orders.filter(o => o.weather === "Storm").length}

            </strong>

          </div>



          <div className="insight">

            <span>High traffic records</span>

            <strong>

              {orders.filter(o => o.traffic === "High").length}

            </strong>

          </div>

        </div>

      </section>

    </div>

  );

}



function ModelPage({ metrics }) {

  return (

    <div className="model-grid">

      <section className="panel">

        <div className="panel-head">

          <div>

            <h2>ETA Regression Model</h2>

            <p>Evaluation on the generated synthetic dataset</p>

          </div>

        </div>



        <div className="metric-cards">

          <Metric

            label="MAE"

            value={metrics?.regression?.MAE}

            suffix=" min"

          />

          <Metric

            label="RMSE"

            value={metrics?.regression?.RMSE}

            suffix=" min"

          />

          <Metric

            label="R²"

            value={metrics?.regression?.R2}

          />

        </div>

      </section>



      <section className="panel">

        <div className="panel-head">

          <div>

            <h2>Delay Classification Model</h2>

            <p>Delay-risk classification metrics</p>

          </div>

        </div>



        <div className="metric-cards">

          <Metric label="Accuracy" value={metrics?.classification?.accuracy} />

          <Metric label="Precision" value={metrics?.classification?.precision} />

          <Metric label="Recall" value={metrics?.classification?.recall} />

          <Metric label="F1" value={metrics?.classification?.F1} />

        </div>

      </section>



      <section className="panel full-span note-panel">

        <strong>Evaluation note</strong>

        <p>

          These metrics represent the current ETAura model evaluation on the

          synthetic development dataset. They should not be presented as

          production performance or as evidence about any specific company.

        </p>

      </section>

    </div>

  );

}



function Field({ label, value, onChange, type = "text" }) {

  return (

    <label className="field">

      <span>{label}</span>

      <input

        type={type}

        value={value}

        onChange={e => onChange(e.target.value)}

        required

      />

    </label>

  );

}



function SelectField({ label, value, options, onChange }) {

  return (

    <label className="field">

      <span>{label}</span>

      <select value={value} onChange={e => onChange(e.target.value)}>

        {options.map(option => (

          <option key={option}>{option}</option>

        ))}

      </select>

    </label>

  );

}



function Metric({ label, value, suffix = "" }) {

  return (

    <div className="metric-card">

      <span>{label}</span>

      <strong>

        {value != null ? `${value}${suffix}` : "—"}

      </strong>

    </div>

  );

}



function RiskBars({ data, large = false }) {

  const total = data.reduce(

    (sum, item) => sum + Number(item.value || 0),

    0

  );



  const normalized = [

    { name: "Low", value: data.find(x => x.name === "Low")?.value || 0 },

    { name: "Medium", value: data.find(x => x.name === "Medium")?.value || 0 },

    { name: "High", value: data.find(x => x.name === "High")?.value || 0 }

  ];



  return (

    <div className={`risk-bars ${large ? "large" : ""}`}>

      {normalized.map(item => {

        const percent = total

          ? (Number(item.value) / total) * 100

          : 0;



        return (

          <div className="risk-bar" key={item.name}>

            <div className="risk-bar-head">

              <span>{item.name}</span>

              <strong>

                {item.value} ({percent.toFixed(0)}%)

              </strong>

            </div>



            <div className="risk-track">

              <div

                className={`risk-fill ${item.name.toLowerCase()}`}

                style={{ width: `${percent}%` }}

              />

            </div>

          </div>

        );

      })}

    </div>

  );

}



createRoot(document.getElementById("root")).render(<App />);

