/**
 * Analytics.jsx — fixed to match actual backend response shapes:
 *   /analytics/trends    → [{month, total, count}]          (plain list)
 *   /analytics/categories→ [{category, total, percentage}]  (plain list)
 *   /analytics/anomalies → [{id, amount, category, ...}]    (plain list)
 *   /analytics/insights  → {insights: ["string", ...]}
 *   /analytics/summary   → {total, count, by_category, ...}
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, Tag,
  DollarSign, Calendar, RefreshCw,
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
  const [trends,setTrends]         = useState([]);
  const [categories,setCategories] = useState([]);
  const [anomalies,setAnomalies]   = useState([]);
  const [forecast,setForecast]     = useState([]);
  const [insights,setInsights]     = useState([]);
  const [loading,setLoading]       = useState(true);
  const [error,setError]           = useState(null);
  const [refreshing,setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      setError(null);
      const [sumRes,trendRes,catRes,anomRes,fcastRes,insRes] = await Promise.allSettled([
        analyticsApi.summary(),
        analyticsApi.trends(),
        analyticsApi.categories(),
        analyticsApi.anomalies(),
        forecastingApi.predict(90),
        analyticsApi.insights(),
      ]);
      if (sumRes.status==="fulfilled")   setSummary(sumRes.value);
      if (trendRes.status==="fulfilled") setTrends(trendRes.value || []);
      if (catRes.status==="fulfilled")   setCategories(catRes.value || []);
      if (anomRes.status==="fulfilled")  setAnomalies(anomRes.value || []);
      if (fcastRes.status==="fulfilled") setForecast(fcastRes.value?.predictions || []);
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
  const avgMonthly  = trends.length ? trends.reduce((a,b)=>a+b.total,0)/trends.length : 0;
  const topCategory = categories[0]?.category ?? "—";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

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

      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Total Spent" value={`$${totalSpent.toFixed(2)}`} sub="All time" color="brand"/>
        <StatCard icon={Calendar} label="Monthly Average" value={`$${avgMonthly.toFixed(2)}`} sub={`Over ${trends.length} months`} color="purple"/>
        <StatCard icon={Tag} label="Top Category" value={topCategory} sub={categories[0]?`$${categories[0].total.toFixed(2)}`:""} color="pink"/>
        <StatCard icon={AlertTriangle} label="Anomalies" value={anomalies.length} sub="Unusual transactions" color="amber"/>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:0.2}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400"/> Monthly Spending
          </h2>
          {trends.length===0 ? (
            <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No trend data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trends} margin={{top:4,right:10,left:-10,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08"/>
                <XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:11}}/>
                <YAxis tick={{fill:"#9ca3af",fontSize:11}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="total" fill="#6366f1" radius={[4,4,0,0]} name="Spent"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} transition={{delay:0.25}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Tag size={16} className="text-purple-400"/> Category Breakdown
          </h2>
          {categories.length===0 ? (
            <div className="h-56 flex items-center justify-center text-gray-500 text-sm">No category data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categories} dataKey="total" nameKey="category"
                  cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}
                  label={({category,percentage})=>`${category} ${percentage}%`} labelLine={false}>
                  {categories.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={(val)=>[`$${val.toFixed(2)}`,"Amount"]}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="glass-card p-5">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400"/> Spending Forecast
        </h2>
        {forecast.length===0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
            Not enough data for forecast — add more expenses first
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
              <XAxis dataKey="date" tick={{fill:"#9ca3af",fontSize:11}}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:11}}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="predicted_amount" stroke="#10b981" strokeWidth={2} fill="url(#fg)" name="Forecast"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.35}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400"/> Anomalous Expenses
          </h2>
          {anomalies.length===0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-sm gap-2">
              <AlertTriangle size={28} className="text-gray-700"/>
              No anomalies detected — great job!
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {anomalies.map((a)=>(
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div>
                    <p className="text-white text-sm font-medium">{a.merchant}</p>
                    <p className="text-gray-500 text-xs">{a.category} · {a.date?.slice(0,10)}</p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">${Number(a.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.4}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-blue-400"/> AI Savings Insights
          </h2>
          {insights.length===0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-sm gap-2">
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

      {categories.length>0 && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.45}} className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categories} layout="vertical" margin={{top:4,right:20,left:60,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" horizontal={false}/>
              <XAxis type="number" tick={{fill:"#9ca3af",fontSize:11}}/>
              <YAxis type="category" dataKey="category" tick={{fill:"#9ca3af",fontSize:11}} width={60}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="total" name="Spent" radius={[0,4,4,0]}>
                {categories.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
