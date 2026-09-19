import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Tag,
  DollarSign, Calendar, RefreshCw, Shield,
} from "lucide-react";
import { analyticsApi, forecastingApi } from "../services/api";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#f97316","#14b8a6"];
const container = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.08}} };
const item = { hidden:{opacity:0,y:20}, show:{opacity:1,y:0} };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 text-sm border border-white/10">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color}} className="font-medium">
          {p.name}: ${Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ icon:Icon, label, value, sub, color="brand" }) => (
  <motion.div variants={item} className="stat-card">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold mt-1 text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
      <div className={`p-2 rounded-lg bg-${color}-500/10`}>
        <Icon size={20} className={`text-${color}-400`} />
      </div>
    </div>
  </motion.div>
);

export default function Analytics() {
  const [summary,setSummary]       = useState(null);
  const [daily,setDaily]           = useState([]);
  const [categories,setCategories] = useState([]);
  const [anomalies,setAnomalies]   = useState([]);
  const [forecast,setForecast]     = useState([]);
  const [forecastSummary,setForecastSummary] = useState(null);
  const [insights,setInsights]     = useState([]);
  const [loading,setLoading]       = useState(true);
  const [error,setError]           = useState(null);
  const [refreshing,setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      setError(null);
      const [sumRes,dailyRes,catRes,anomRes,fcastRes,insRes] = await Promise.allSettled([
        analyticsApi.summary(),
        analyticsApi.daily(30),
        analyticsApi.categories(),
        analyticsApi.anomalies(),
        forecastingApi.predict(30),
        analyticsApi.insights(),
      ]);
      if (sumRes.status==="fulfilled")   setSummary(sumRes.value);
      if (dailyRes.status==="fulfilled") setDaily(dailyRes.value || []);
      if (catRes.status==="fulfilled")   setCategories(catRes.value || []);
      if (anomRes.status==="fulfilled")  setAnomalies(anomRes.value || []);
      if (fcastRes.status==="fulfilled") {
        setForecast(fcastRes.value?.predictions || []);
        setForecastSummary(fcastRes.value?.summary || null);
      }
      if (insRes.status==="fulfilled")   setInsights(insRes.value?.insights || []);
    } catch(err) {
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="skeleton h-8 w-48 rounded-lg"/>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-xl"/>)}
      </div>
    </div>
  );

  const totalSpent  = summary?.total ?? 0;
  const topCategory = categories[0]?.category ?? "—";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}}
        className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Visual breakdown of your spending patterns</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={refreshing?"animate-spin":""}/> Refresh
        </button>
      </motion.div>

      {error && <div className="glass-card p-4 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {/* Stat Cards */}
      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Spent" value={`$${totalSpent.toFixed(2)}`} sub="This month" color="brand"/>
        <StatCard icon={Calendar} label="Transactions" value={summary?.count ?? 0} sub="This month" color="purple"/>
        <StatCard icon={Tag} label="Top Category" value={topCategory} sub={categories[0]?`$${categories[0].total.toFixed(2)}`:""} color="pink"/>
        <StatCard icon={AlertTriangle} label="Anomalies" value={anomalies.length} sub="Unusual transactions" color="amber"/>
      </motion.div>

      {/* Daily Spending Chart */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15}} className="glass-card p-5">
        <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-400"/> Daily Spending (Last 30 Days)
        </h2>
        <p className="text-xs text-gray-500 mb-4">Each bar is one day's total spending</p>
        {daily.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No spending data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={daily} margin={{top:4,right:10,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="label" tick={{fill:"#9ca3af",fontSize:11}}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:11}} tickFormatter={v=>`$${v}`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} name="Spent"/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>


      {/* Spending Forecast */}
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.25}} className="glass-card p-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400"/> Spending Forecast (Next 30 Days)
          </h2>
          {forecastSummary && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {forecastSummary.method || 'ML'} model
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Predicted daily spending based on your historical patterns.
          {forecastSummary && ` Estimated total: $${forecastSummary.total_predicted?.toFixed(2)}`}
        </p>
        {forecast.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm text-center px-8">
            Not enough data for forecast — add at least 7 expenses on different days first
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={forecast} margin={{top:4,right:10,left:-10,bottom:0}}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
              <XAxis dataKey="date" tick={{fill:"#9ca3af",fontSize:10}}
                tickFormatter={d => d ? d.slice(5) : ''} interval="preserveStartEnd"/>
              <YAxis tick={{fill:"#9ca3af",fontSize:11}} tickFormatter={v=>`$${v}`}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2}
                fill="url(#fg)" name="Forecast"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Anomalies */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400"/> Anomalous Expenses
          </h2>

          {anomalies.length===0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm gap-2">
              <Shield size={28} className="text-gray-700"/>
              No anomalies detected — spending looks normal!
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {anomalies.map((a)=>(
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div>
                    <p className="text-white text-sm font-medium">{a.merchant || 'Unknown'}</p>
                    <p className="text-gray-500 text-xs">{a.category} · {a.date?.slice(0,10)}</p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">${Number(a.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Insights */}
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.35}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <TrendingDown size={16} className="text-blue-400"/> Savings Insights
          </h2>
          <p className="text-xs text-gray-500 mb-4">Rule-based tips from your spending patterns</p>
          {insights.length===0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 text-sm gap-2">
              <TrendingDown size={28} className="text-gray-700"/>
              Add more expenses to unlock insights
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {insights.map((ins,i)=>(
                <div key={i} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <p className="text-sm text-gray-300">{typeof ins==="string"?ins:ins.message}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
