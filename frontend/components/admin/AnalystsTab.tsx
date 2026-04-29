"use client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

const NATIONALITIES = ["Algeria","Argentina","Australia","Belgium","Brazil","Cameroon","Canada","Chile","China","Colombia","Croatia","Czech Republic","Denmark","Ecuador","Egypt","England","France","Germany","Ghana","Greece","Hungary","India","Iran","Iraq","Ireland","Italy","Japan","Mexico","Morocco","Netherlands","Nigeria","Norway","Poland","Portugal","Romania","Saudi Arabia","Scotland","Senegal","Serbia","South Africa","South Korea","Spain","Sweden","Switzerland","Tunisia","Turkey","Ukraine","United States","Uruguay","Wales"];
const LANGUAGES = ["English","Spanish","French","Portuguese","German","Italian","Arabic","Turkish","Dutch","Russian","Japanese","Korean","Chinese","Hindi","Swahili"];
const CERTIFICATIONS = ["UEFA Pro License","UEFA A License","UEFA B License","FA Level 3","FA Level 2","Sports Science Degree","Performance Analysis Diploma","InStat Certified","Hudl Certified","Wyscout Certified","Other"];

export function AnalystsTab() {
    const createAnalyst = useMutation(api.users.createAnalystAccount);
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [nationality, setNationality] = useState("");
    const [experience, setExperience] = useState("");
    const [bio, setBio] = useState("");
    const [certs, setCerts] = useState<string[]>([]);
    const [langs, setLangs] = useState<string[]>(["English"]);

    const reset = () => { setName(""); setEmail(""); setNationality(""); setExperience(""); setBio(""); setCerts([]); setLangs(["English"]); setMsg(""); };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (langs.length === 0) { setMsg("Select at least one language"); return; }
        setLoading(true); setMsg("");
        try {
            await createAnalyst({ name, email, analystProfile: { nationality, experience: parseInt(experience), certifications: certs, languages: langs, bio } });
            setMsg("✅ Analyst created successfully! They can sign in with their email.");
            reset(); setShow(false);
        } catch (err: any) { setMsg("❌ " + (err?.message || "Failed")); }
        setLoading(false);
    };

    const toggle = (arr: string[], val: string, set: (v: string[]) => void) => set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <p className="text-white/40 text-sm">Create and manage analyst accounts.</p>
                <button onClick={() => { setShow(!show); setMsg(""); }} className="px-4 py-2 rounded-xl text-xs font-semibold text-[#0A0A0F] bg-[#3B82F6] hover:bg-[#3B82F6]/90 cursor-pointer transition-all">
                    {show ? "Cancel" : "+ Create Analyst"}
                </button>
            </div>
            {msg && <div className={`p-3 rounded-xl text-sm mb-4 ${msg.startsWith("✅") ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>{msg}</div>}
            {show && (
                <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-white/50 mb-1.5">Full Name *</label>
                            <input value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#3B82F6]/50" /></div>
                        <div><label className="block text-xs text-white/50 mb-1.5">Email *</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#3B82F6]/50" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-white/50 mb-1.5">Nationality *</label>
                            <select value={nationality} onChange={e => setNationality(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none appearance-none">
                                <option value="" className="bg-[#12121a]">Select...</option>
                                {NATIONALITIES.map(n => <option key={n} value={n} className="bg-[#12121a]">{n}</option>)}
                            </select></div>
                        <div><label className="block text-xs text-white/50 mb-1.5">Experience (years) *</label>
                            <input type="number" value={experience} onChange={e => setExperience(e.target.value)} required min={0} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#3B82F6]/50" /></div>
                    </div>
                    <div><label className="block text-xs text-white/50 mb-2">Languages *</label>
                        <div className="flex flex-wrap gap-1.5">{LANGUAGES.map(l => (
                            <button type="button" key={l} onClick={() => toggle(langs, l, setLangs)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${langs.includes(l) ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"}`}>{l}</button>
                        ))}</div></div>
                    <div><label className="block text-xs text-white/50 mb-2">Certifications</label>
                        <div className="flex flex-wrap gap-1.5">{CERTIFICATIONS.map(c => (
                            <button type="button" key={c} onClick={() => toggle(certs, c, setCerts)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${certs.includes(c) ? "bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"}`}>{c}</button>
                        ))}</div></div>
                    <div><label className="block text-xs text-white/50 mb-1.5">Bio *</label>
                        <textarea value={bio} onChange={e => setBio(e.target.value)} required rows={3} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#3B82F6]/50 resize-none" /></div>
                    <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl text-sm font-semibold text-[#0A0A0F] bg-[#3B82F6] hover:bg-[#3B82F6]/90 cursor-pointer transition-all disabled:opacity-50">
                        {loading ? "Creating..." : "Create Analyst Account"}
                    </button>
                </form>
            )}
        </div>
    );
}
