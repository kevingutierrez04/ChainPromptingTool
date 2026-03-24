"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import type { HumorFlavor, HumorFlavorStep, Caption, Image, LlmModel, LlmInputType, LlmOutputType, HumorFlavorStepType } from "@/types";

interface FlavorEditorProps {
  flavor: HumorFlavor;
  initialSteps: HumorFlavorStep[];
  captions: Caption[];
  testImages: Image[];
  llmModels: LlmModel[];
  llmInputTypes: LlmInputType[];
  llmOutputTypes: LlmOutputType[];
  stepTypes: HumorFlavorStepType[];
}

export function FlavorEditor({
  flavor,
  initialSteps,
  captions,
  testImages,
  llmModels,
  llmInputTypes,
  llmOutputTypes,
  stepTypes,
}: FlavorEditorProps) {
  const router = useRouter();

  const [flavorSlug, setFlavorSlug] = useState(flavor.slug);
  const [flavorDesc, setFlavorDesc] = useState(flavor.description ?? "");
  const [editingFlavor, setEditingFlavor] = useState(false);
  const [savingFlavor, setSavingFlavor] = useState(false);

  const [steps, setSteps] = useState<HumorFlavorStep[]>(initialSteps);
  const [newSystemPrompt, setNewSystemPrompt] = useState("");
  const [newUserPrompt, setNewUserPrompt] = useState("");
  const [newStepDesc, setNewStepDesc] = useState("");
  const [newModelId, setNewModelId] = useState<number>(llmModels[0]?.id ?? 0);
  const [newInputTypeId, setNewInputTypeId] = useState<number>(llmInputTypes[0]?.id ?? 0);
  const [newOutputTypeId, setNewOutputTypeId] = useState<number>(llmOutputTypes[0]?.id ?? 0);
  const [newStepTypeId, setNewStepTypeId] = useState<number>(stepTypes[0]?.id ?? 0);
  const [addingStep, setAddingStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editUserPrompt, setEditUserPrompt] = useState("");
  const [editStepDesc, setEditStepDesc] = useState("");
  const [editModelId, setEditModelId] = useState<number>(0);
  const [editInputTypeId, setEditInputTypeId] = useState<number>(0);
  const [editOutputTypeId, setEditOutputTypeId] = useState<number>(0);
  const [editStepTypeId, setEditStepTypeId] = useState<number>(0);

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const [selectedImageId, setSelectedImageId] = useState<string>(testImages[0]?.id ?? "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"steps" | "captions" | "test">("steps");

  const saveFlavor = async () => {
    setSavingFlavor(true);
    const res = await fetch(`/api/flavors/${flavor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: flavorSlug, description: flavorDesc }),
    });
    setSavingFlavor(false);
    if (res.ok) { setEditingFlavor(false); router.refresh(); }
    else alert("Failed to save flavor");
  };

  const deleteFlavor = async () => {
    if (!confirm(`Delete "${flavor.slug}"? This will also delete all steps.`)) return;
    const res = await fetch(`/api/flavors/${flavor.id}`, { method: "DELETE" });
    if (res.ok) router.push("/dashboard");
    else alert("Failed to delete flavor");
  };

  const addStep = async () => {
    setAddingStep(true);
    const res = await fetch(`/api/flavors/${flavor.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llm_system_prompt: newSystemPrompt || null,
        llm_user_prompt: newUserPrompt || null,
        description: newStepDesc || null,
        llm_model_id: newModelId,
        llm_input_type_id: newInputTypeId,
        llm_output_type_id: newOutputTypeId,
        humor_flavor_step_type_id: newStepTypeId,
      }),
    });
    setAddingStep(false);
    if (res.ok) {
      const step = await res.json();
      setSteps((prev) => [...prev, step]);
      setNewSystemPrompt(""); setNewUserPrompt(""); setNewStepDesc("");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Failed to add step");
    }
  };

  const saveStep = async (stepId: number) => {
    const res = await fetch(`/api/flavors/${flavor.id}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        llm_system_prompt: editSystemPrompt || null,
        llm_user_prompt: editUserPrompt || null,
        description: editStepDesc || null,
        llm_model_id: editModelId,
        llm_input_type_id: editInputTypeId,
        llm_output_type_id: editOutputTypeId,
        humor_flavor_step_type_id: editStepTypeId,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSteps((prev) => prev.map((s) => (s.id === stepId ? updated : s)));
      setEditingStepId(null);
    } else alert("Failed to save step");
  };

  const deleteStep = async (stepId: number) => {
    if (!confirm("Delete this step?")) return;
    const res = await fetch(`/api/flavors/${flavor.id}/steps/${stepId}`, { method: "DELETE" });
    if (res.ok) setSteps((prev) => prev.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, order_by: i + 1 })));
    else alert("Failed to delete step");
  };

  const moveStep = async (direction: "up" | "down", stepId: number) => {
    const idx = steps.findIndex((s) => s.id === stepId);
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= steps.length) return;
    const reordered = [...steps];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const numbered = reordered.map((s, i) => ({ ...s, order_by: i + 1 }));
    setSteps(numbered);
    await fetch(`/api/flavors/${flavor.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: numbered.map((s) => s.id) }),
    });
  };

  const onDrop = async (targetId: number) => {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    const fromIdx = steps.findIndex((s) => s.id === draggedId);
    const toIdx = steps.findIndex((s) => s.id === targetId);
    const reordered = [...steps];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const numbered = reordered.map((s, i) => ({ ...s, order_by: i + 1 }));
    setSteps(numbered); setDraggedId(null); setDragOverId(null);
    await fetch(`/api/flavors/${flavor.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: numbered.map((s) => s.id) }),
    });
  };

  const runTest = async () => {
    if (!selectedImageId) return;
    setTesting(true); setTestResult(null); setTestError(null);
    const res = await fetch(`/api/flavors/${flavor.id}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_id: selectedImageId }),
    });
    setTesting(false);
    if (res.ok) {
      const data = await res.json();
      const extract = (item: unknown): string =>
        typeof item === "string" ? item : (item as Record<string, unknown>)?.content as string ?? JSON.stringify(item);
      if (Array.isArray(data)) setTestResult(data.map(extract));
      else if (data.captions) setTestResult((Array.isArray(data.captions) ? data.captions : [data.captions]).map(extract));
      else if (data.content) setTestResult([String(data.content)]);
      else setTestResult([JSON.stringify(data, null, 2)]);
    } else {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      setTestError(err.error ?? "Failed to generate captions");
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft size={14} /> All Flavors
      </Link>

      {/* Flavor Header */}
      <div className="mb-8 p-6 rounded-2xl border border-border bg-card">
        {editingFlavor ? (
          <div className="flex flex-col gap-3">
            <input value={flavorSlug} onChange={(e) => setFlavorSlug(e.target.value)} autoFocus placeholder="flavor-slug"
              className="text-2xl font-bold bg-transparent border-b border-input focus:outline-none focus:border-ring pb-1" />
            <textarea value={flavorDesc} onChange={(e) => setFlavorDesc(e.target.value)} rows={2} placeholder="Description (optional)"
              className="text-sm bg-transparent border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex gap-2">
              <button onClick={saveFlavor} disabled={savingFlavor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
                <Check size={12} />{savingFlavor ? "Saving..." : "Save"}
              </button>
              <button onClick={() => { setFlavorSlug(flavor.slug); setFlavorDesc(flavor.description ?? ""); setEditingFlavor(false); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors">
                <X size={12} />Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold font-mono">{flavor.slug}</h1>
              {flavor.description && <p className="text-muted-foreground mt-1 text-sm">{flavor.description}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setEditingFlavor(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors">
                <Pencil size={12} />Edit
              </button>
              <button onClick={deleteFlavor}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-xs text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={12} />Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(["steps", "captions", "test"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "captions" ? `Captions (${captions.length})` : tab === "steps" ? `Steps (${steps.length})` : "Test"}
          </button>
        ))}
      </div>

      {/* Steps Tab */}
      {activeTab === "steps" && (
        <div className="flex flex-col gap-3">
          {steps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No steps yet. Add your first prompt step below.</p>
          )}
          {steps.map((step, idx) => (
            <div key={step.id} draggable
              onDragStart={() => setDraggedId(step.id)}
              onDragOver={(e) => { e.preventDefault(); setDragOverId(step.id); }}
              onDrop={() => onDrop(step.id)}
              onDragEnd={() => { setDraggedId(null); setDragOverId(null); }}
              className={`group flex gap-3 p-4 rounded-xl border transition-all ${dragOverId === step.id ? "border-foreground bg-muted" : draggedId === step.id ? "opacity-40 border-dashed border-border" : "border-border bg-card"}`}>
              <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                <GripVertical size={16} className="text-muted-foreground cursor-grab active:cursor-grabbing" />
                <span className="text-xs font-mono text-muted-foreground">{step.order_by}</span>
              </div>
              <div className="flex-1 min-w-0">
                {editingStepId === step.id ? (
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt</label>
                      <textarea value={editSystemPrompt} onChange={(e) => setEditSystemPrompt(e.target.value)} rows={4} autoFocus
                        className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">User Prompt <span className="font-normal">(optional)</span></label>
                      <textarea value={editUserPrompt} onChange={(e) => setEditUserPrompt(e.target.value)} rows={2}
                        className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Description <span className="font-normal">(optional)</span></label>
                      <input value={editStepDesc} onChange={(e) => setEditStepDesc(e.target.value)}
                        className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
                        <select value={editModelId} onChange={(e) => setEditModelId(Number(e.target.value))}
                          className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                          {llmModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Step Type</label>
                        <select value={editStepTypeId} onChange={(e) => setEditStepTypeId(Number(e.target.value))}
                          className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                          {stepTypes.map((t) => <option key={t.id} value={t.id}>{t.slug}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Input Type</label>
                        <select value={editInputTypeId} onChange={(e) => setEditInputTypeId(Number(e.target.value))}
                          className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                          {llmInputTypes.map((t) => <option key={t.id} value={t.id}>{t.slug}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Output Type</label>
                        <select value={editOutputTypeId} onChange={(e) => setEditOutputTypeId(Number(e.target.value))}
                          className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                          {llmOutputTypes.map((t) => <option key={t.id} value={t.id}>{t.slug}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveStep(step.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                        <Check size={11} /> Save
                      </button>
                      <button onClick={() => setEditingStepId(null)} className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border text-xs hover:bg-muted">
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {step.description && <p className="text-xs font-medium text-muted-foreground">{step.description}</p>}
                    <div><span className="text-xs text-muted-foreground font-medium">System: </span><span className="text-sm whitespace-pre-wrap">{step.llm_system_prompt}</span></div>
                    {step.llm_user_prompt && <div><span className="text-xs text-muted-foreground font-medium">User: </span><span className="text-sm whitespace-pre-wrap">{step.llm_user_prompt}</span></div>}
                  </div>
                )}
              </div>
              {editingStepId !== step.id && (
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => moveStep("up", step.id)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-20"><ChevronUp size={14} /></button>
                  <button onClick={() => moveStep("down", step.id)} disabled={idx === steps.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-20"><ChevronDown size={14} /></button>
                  <button onClick={() => { setEditingStepId(step.id); setEditSystemPrompt(step.llm_system_prompt ?? ""); setEditUserPrompt(step.llm_user_prompt ?? ""); setEditStepDesc(step.description ?? ""); setEditModelId(step.llm_model_id); setEditInputTypeId(step.llm_input_type_id); setEditOutputTypeId(step.llm_output_type_id); setEditStepTypeId(step.humor_flavor_step_type_id); }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                  <button onClick={() => deleteStep(step.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          ))}

          {/* Add step form */}
          <div className="mt-2 p-4 rounded-xl border border-dashed border-border flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground">Add Step {steps.length + 1}</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">System Prompt *</label>
              <textarea value={newSystemPrompt} onChange={(e) => setNewSystemPrompt(e.target.value)}
                placeholder="You are a funny caption writer. Given an image description, write a short funny caption."
                rows={3} className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">User Prompt <span className="font-normal">(optional)</span></label>
              <textarea value={newUserPrompt} onChange={(e) => setNewUserPrompt(e.target.value)}
                placeholder="Generate 5 captions for this image."
                rows={2} className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description <span className="font-normal">(optional)</span></label>
              <input value={newStepDesc} onChange={(e) => setNewStepDesc(e.target.value)}
                placeholder="e.g. Initial image description step"
                className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Model</label>
                <select value={newModelId} onChange={(e) => setNewModelId(Number(e.target.value))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                  {llmModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Step Type</label>
                <select value={newStepTypeId} onChange={(e) => setNewStepTypeId(Number(e.target.value))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                  {stepTypes.map((t) => <option key={t.id} value={t.id}>{t.slug}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Input Type</label>
                <select value={newInputTypeId} onChange={(e) => setNewInputTypeId(Number(e.target.value))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                  {llmInputTypes.map((t) => <option key={t.id} value={t.id}>{t.slug}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Output Type</label>
                <select value={newOutputTypeId} onChange={(e) => setNewOutputTypeId(Number(e.target.value))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring">
                  {llmOutputTypes.map((t) => <option key={t.id} value={t.id}>{t.slug}</option>)}
                </select>
              </div>
            </div>
            <button onClick={addStep} disabled={addingStep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50 w-fit">
              <Plus size={12} />{addingStep ? "Adding..." : "Add Step"}
            </button>
          </div>
        </div>
      )}

      {/* Captions Tab */}
      {activeTab === "captions" && (
        <div className="flex flex-col gap-3">
          {captions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No captions generated with this flavor yet. Use the Test tab to generate some.</p>
          ) : (
            captions.map((caption) => (
              <div key={caption.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex gap-4">
                  {caption.images?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={caption.images.url} alt={caption.images.image_description ?? ""} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{caption.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(caption.created_datetime_utc).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Test Tab */}
      {activeTab === "test" && (
        <div className="flex flex-col gap-6">
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Add at least one step before testing.</p>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium mb-3">Select a test image</p>
                {testImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No common-use images available. Mark images as <code className="text-xs bg-muted px-1 rounded">is_common_use = true</code> in Supabase.</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {testImages.map((img) => (
                      <button key={img.id} onClick={() => setSelectedImageId(img.id)}
                        className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all ${selectedImageId === img.id ? "border-foreground" : "border-transparent"}`}>
                        {img.url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={img.url} alt={img.image_description ?? ""} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">No img</div>}
                        {selectedImageId === img.id && (
                          <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center"><Check size={16} className="text-white drop-shadow" /></div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={runTest} disabled={testing || !selectedImageId}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 w-fit">
                {testing ? <><Loader2 size={16} className="animate-spin" />Generating...</> : <><Play size={16} />Run Flavor Test</>}
              </button>

              {testError && <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive">{testError}</div>}

              {testResult && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">Generated Captions</p>
                  {testResult.map((caption, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-card text-sm">
                      <span className="text-xs text-muted-foreground font-mono mr-2">{i + 1}.</span>{caption}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}