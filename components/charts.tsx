"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#2f6840", "#a3d977", "#63a06f", "#eaf6df", "#95bf9e", "#265334"];

export function MacroBars({ data }: { data: { name: string; protein: number; carbs: number; fat: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0ede3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#2f6840" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#438353" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e0ede3", fontSize: 12 }} />
          <Bar dataKey="protein" name="Protein (g)" fill="#2f6840" radius={[4, 4, 0, 0]} />
          <Bar dataKey="carbs" name="Carbs (g)" fill="#a3d977" radius={[4, 4, 0, 0]} />
          <Bar dataKey="fat" name="Fat (g)" fill="#95bf9e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CalorieLine({ data }: { data: { name: string; calories: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0ede3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#2f6840" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#438353" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e0ede3", fontSize: 12 }} />
          <Line type="monotone" dataKey="calories" name="Calories" stroke="#2f6840" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MealSplit({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e0ede3", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BudgetBars({ data }: { data: { name: string; planned: number; budget: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0ede3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#2f6840" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#438353" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e0ede3", fontSize: 12 }} />
          <Bar dataKey="budget" name="Budget" fill="#eaf6df" radius={[4, 4, 0, 0]} />
          <Bar dataKey="planned" name="Planned cost" fill="#2f6840" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
