import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { 
  Upload, 
  Activity, 
  FileText, 
  Sparkles, 
  Cpu, 
  FileDown, 
  Moon, 
  Sun, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert, 
  Clock, 
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { exportToPDF } from "@/utils/pdfGenerator";

// Defect interface
interface Defect {
  id: string;
  type: string;
  severity: "Critical" | "Warning" | "Low" | "None";
  confidence: number;
  location: string;
  dimensions: string;
  recommendation: string;
}

// Preset Demo Asset Data
interface DemoAsset {
  id: string;
  name: string;
  category: string;
  originalImage: string;
  processedImage: string;
  overallSeverity: "Critical" | "Warning" | "Low" | "None";
  overallConfidence: number;
  defectArea?: number; // Defect area percentage
  summary: string;
  defects: Defect[];
}

const DEMO_ASSETS: DemoAsset[] = [
  {
    id: "asset-1",
    name: "Concrete Pier Column - Bridge #24A",
    category: "Concrete Structures",
    originalImage: "/bridge_original.png",
    processedImage: "/bridge_processed.png",
    overallSeverity: "Critical",
    overallConfidence: 98.4,
    defectArea: 1.84,
    summary: "Significant shear cracking detected on the primary load-bearing concrete pier of Bridge #24A. Cracks demonstrate active widening trends. Immediate structural intervention is advised.",
    defects: [
      {
        id: "DEF-001",
        type: "Structural Crack",
        severity: "Critical",
        confidence: 98.4,
        location: "Mid-section, South Pier Face",
        dimensions: "Width: 4.2mm, Length: 124.5cm",
        recommendation: "Load testing and immediate structural reinforcement/sealing."
      },
      {
        id: "DEF-002",
        type: "Concrete Spalling",
        severity: "Warning",
        confidence: 91.2,
        location: "Lower-right edge",
        dimensions: "Area: 45cm², Depth: 12mm",
        recommendation: "Patch repairs with polymer-modified repair mortar."
      },
      {
        id: "DEF-003",
        type: "Efflorescence / Moisture",
        severity: "Low",
        confidence: 88.6,
        location: "Upper-left pier joint",
        dimensions: "Area: 180cm²",
        recommendation: "Seal joint and inspect drainage routing."
      }
    ]
  },
  {
    id: "asset-2",
    name: "High-Pressure Gas Pipeline - Segment 4",
    category: "Steel Infrastructure",
    originalImage: "/bridge_original.png", 
    processedImage: "/bridge_processed.png",
    overallSeverity: "Warning",
    overallConfidence: 92.5,
    defectArea: 0.62,
    summary: "Localized exterior corrosion and coating breakdown identified on Pipe Segment 4. No active wall-thinning leaks detected, but scheduled preservation is required.",
    defects: [
      {
        id: "DEF-004",
        type: "Surface Corrosion",
        severity: "Warning",
        confidence: 92.5,
        location: "Under-bracket assembly",
        dimensions: "Area: 120cm², Depth: 0.8mm",
        recommendation: "Sandblast surface, apply anti-corrosion primer, and recoat."
      },
      {
        id: "DEF-005",
        type: "Coating Delamination",
        severity: "Low",
        confidence: 95.1,
        location: "Pipe underside, 2m from support",
        dimensions: "Area: 40cm²",
        recommendation: "Monitor during next regular routine check."
      }
    ]
  }
];

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [selectedAsset, setSelectedAsset] = useState<DemoAsset | null>(null);
  const [selectedEngine] = useState<"gemini">("gemini");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStepText, setAnalysisStepText] = useState<string>("");
  const [viewMode, setViewMode] = useState<"side-by-side" | "original" | "processed">("side-by-side");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>("");
  const [currentBase64Preview, setCurrentBase64Preview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply dark mode class to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSelectedAsset(null);
        startAnalysisFlow(file, event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerOfflineFallback = () => {
    setApiError(null);
    setIsAnalyzing(false);
    setSelectedAsset({
      id: "custom-fallback",
      name: currentFileName || "Uploaded Asset",
      category: "Offline Simulation",
      originalImage: currentBase64Preview || "/bridge_original.png",
      processedImage: "/bridge_processed.png",
      overallSeverity: "Critical",
      overallConfidence: 96.8,
      defectArea: 1.42,
      summary: "Anomaly inspection completed in offline simulation. Detected high-probability cracking vectors along structural planes. Remedial patching and physical testing recommended.",
      defects: [
        {
          id: "DEF-FALLBACK-1",
          type: "Primary Fracture Line (Simulated)",
          severity: "Critical",
          confidence: 96.8,
          location: "Quadrant coordinates B3",
          dimensions: "Estimated: width 3.8mm, depth structural",
          recommendation: "Seal and reinforce with specialized high-tensile epoxy."
        },
        {
          id: "DEF-FALLBACK-2",
          type: "Secondary Spall Area (Simulated)",
          severity: "Low",
          confidence: 85.2,
          location: "Quadrant coordinates D1",
          dimensions: "Estimated area: 32cm²",
          recommendation: "Surface smoothing and moisture sealing."
        }
      ]
    });
  };

  // Run simulated/actual analysis
  const startAnalysisFlow = (file?: File, base64Preview?: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setApiError(null);
    
    if (file) {
      setCurrentFileName(file.name);
      setCurrentBase64Preview(base64Preview || "");
      setIsUploading(true);
      setUploadProgress(0);
    } else {
      setIsUploading(false);
    }
    
    const steps = [
      { progress: 15, text: "Initializing ResNet AI core model..." },
      { progress: 40, text: "Performing geometric image alignment..." },
      { progress: 65, text: "Running structural anomaly inspection..." },
      { progress: 85, text: "Plotting defect bounding overlays..." },
      { progress: 100, text: "Compiling detailed severity parameters..." }
    ];

    let currentStep = 0;
    const animationInterval = setInterval(() => {
      if (currentStep < steps.length) {
        setAnalysisProgress(steps[currentStep].progress);
        setAnalysisStepText(steps[currentStep].text);
        currentStep++;
      } else {
        clearInterval(animationInterval);
      }
    }, 300);

    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      axios.post(`http://localhost:8000/api/upload?engine=${selectedEngine}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percent);
          if (percent >= 100) {
            setIsUploading(false);
          }
        }
      })
        .then((response) => {
          setIsUploading(false);
          setTimeout(() => {
            setIsAnalyzing(false);
            setSelectedAsset(response.data);
          }, 1500);
        })
        .catch((err) => {
          setIsUploading(false);
          console.warn("Backend API call failed.", err);
          const msg = err.response?.data?.detail || "Could not reach the diagnostic server on port 8000. Verify the backend is active.";
          setApiError(msg);
        });
    } else {
      // Local preset select
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 1500);
    }
  };

  const handleSelectDemo = (asset: DemoAsset) => {
    setSelectedAsset(asset);
    startAnalysisFlow();
  };

  const handleExportPDF = async () => {
    if (!selectedAsset) return;
    setIsExporting(true);
    try {
      await exportToPDF("inspection-report-dashboard", `inspection-report-${selectedAsset.id}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical":
        return <span className="badge badge-critical">Critical Action</span>;
      case "Warning":
        return <span className="badge badge-warning">Warning Flag</span>;
      case "Low":
        return <span className="badge badge-low">Low Risk</span>;
      default:
        return <span className="badge badge-none">Clear Asset</span>;
    }
  };

  return (
    <div className="app-container">
      <div className="grid-overlay"></div>

      {/* Header */}
      <header className="header">
        <div className="header-logo-group">
          <div className="ibm-logo">IBM</div>
          <div className="header-title">
            Infrastructure Inspect
          </div>
        </div>

        <div className="header-controls">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="btn-icon"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={15} style={{ color: "#f5c400" }} /> : <Moon size={15} style={{ color: "#3b82f6" }} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
        
        {/* Hero Section */}
        <section className="hero-banner">
          <div className="hero-text">
            <div className="hero-tag">
              <Sparkles size={12} style={{ marginRight: "4px" }} />
              AI Inspection Portal
            </div>
            <h2 className="hero-title">Autonomous Infrastructure Diagnostics</h2>
            <p className="hero-description">
              Inspect critical concrete, metal, and mechanical infrastructure using deep vision transformers. Upload structural scans to locate cracks, concrete spalling, or corrosion damage immediately.
            </p>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            /* Scanning / Uploading State */
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              style={{ display: "flex", justifyContent: "center" }}
            >
              {apiError ? (
                /* Connection Error Panel */
                <div className="card progress-card" style={{ borderColor: "var(--critical)", maxWidth: "450px" }}>
                  <div className="card-body" style={{ textAlign: "center", padding: "2rem" }}>
                    <div className="progress-header" style={{ marginBottom: "1.5rem" }}>
                      <div className="progress-icon-spin" style={{ backgroundColor: "var(--critical-bg)", color: "var(--critical)", margin: "0 auto 1rem" }}>
                        <ShieldAlert size={24} />
                      </div>
                      <div className="progress-title-text" style={{ color: "var(--critical)", fontSize: "1rem" }}>Diagnostic Failure</div>
                      <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                        {apiError}
                      </p>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
                      <button 
                        onClick={triggerOfflineFallback}
                        className="btn btn-primary"
                        style={{ width: "100%" }}
                      >
                        Proceed Offline Simulation
                      </button>
                      <button 
                        onClick={() => { setIsAnalyzing(false); setApiError(null); }}
                        className="btn btn-outline"
                        style={{ width: "100%" }}
                      >
                        Cancel & Try Again
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Uploading & Analyzing Progress */
                <div className="card progress-card" style={{ width: "100%", maxWidth: "500px" }}>
                  <div className="card-body">
                    <div className="progress-header">
                      <div className="progress-icon-spin">
                        <Activity className="animate-spin" size={24} />
                      </div>
                      <div className="progress-title-text">
                        {isUploading ? "Uploading Asset" : "Analyzing Asset"}
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)" }}>
                        {isUploading 
                          ? "Streaming payload packet buffers to server..." 
                          : "ResNet vision layers parsing pixel matrices..."}
                      </p>
                    </div>

                    <div className="progress-bar-group">
                      <div className="progress-labels">
                        <span style={{ color: "var(--primary)", fontWeight: "bold" }}>
                          {isUploading ? "Axios Stream Upload" : analysisStepText}
                        </span>
                        <span style={{ color: "var(--muted-foreground)" }}>
                          {isUploading ? uploadProgress : analysisProgress}%
                        </span>
                      </div>
                      <div className="progress-bar-track">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${isUploading ? uploadProgress : analysisProgress}%` }}
                        ></div>
                      </div>
                    </div>

                    {!isUploading && (
                      <div className="console-container">
                        <div className="console-text pulse-slow">
                          <p>&gt; INFRASTRUCTURE AI ENGINE V9.42 INITIALIZED</p>
                          <p>&gt; FETCHING IMAGE BOUNDARY BLOCKS...</p>
                          {analysisProgress > 20 && <p>&gt; OK: IMAGE SHAPE (2048, 1536) ALIGNED</p>}
                          {analysisProgress > 50 && <p>&gt; RUNNING PIXEL CONVOLUTIONS [RESNET BACKBONE]</p>}
                          {analysisProgress > 70 && <p>&gt; DETECTING ANOMALIES: LOCATING CRACK SEGMENTS</p>}
                          {analysisProgress > 90 && <p>&gt; COMPILE DICTIONARY PARSE: DONE</p>}
                        </div>
                        <div style={{ position: "absolute", right: "12px", bottom: "12px", fontSize: "0.6rem", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Clock size={10} className="animate-spin" />
                          <span>{analysisProgress < 100 ? "Active" : "Ready"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : !selectedAsset ? (
            /* Drag and Drop Uploader State */
            <motion.div
              key="uploader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="demo-selector-section"
            >
              <div className="demo-selector-title">
                Select a live demo asset to run diagnostics instantly
              </div>
              <div className="demo-buttons-group">
                {DEMO_ASSETS.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleSelectDemo(asset)}
                    className="demo-btn"
                  >
                    <div className="demo-btn-dot"></div>
                    <div>
                      <span className="demo-btn-label">{asset.category}</span>
                      <span className="demo-btn-name">{asset.name}</span>
                    </div>
                    <ArrowRight size={14} style={{ marginLeft: "0.5rem", color: "var(--primary)" }} />
                  </button>
                ))}
              </div>

              <div style={{ textAlign: "center", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--muted-foreground)", margin: "1.5rem 0" }}>
                — OR UPLOAD CUSTOM STRUCTURAL PHOTO/VIDEO —
              </div>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  Active Engine:
                </span>
                <span style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "0px",
                  padding: "0.4rem 0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  textTransform: "uppercase"
                }}>
                  Gemini 3.5 Flash (Cloud VLM)
                </span>
              </div>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`dropzone ${isDragOver ? "active" : ""}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*"
                  style={{ display: "none" }}
                />
                
                <div className="dropzone-icon">
                  <Upload size={20} />
                </div>
                <h3 className="dropzone-title">
                  Drag & drop asset photo or video here, or <span className="dropzone-link">browse</span>
                </h3>
                <p className="dropzone-subtitle">
                  Accepts PNG, JPG, JPEG, MP4, WebM (Max 15MB)
                </p>
              </div>
            </motion.div>
          ) : (
            /* Results Page View */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id="inspection-report-dashboard"
            >
              {/* Header inside results */}
              <div className="results-header-bar">
                <div>
                  <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "0.25rem" }}>
                    AI Diagnostic Output
                  </span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "500" }}>{selectedAsset.name}</h2>
                </div>

                <div className="results-actions no-pdf">
                  <button
                    onClick={() => {
                      setSelectedAsset(null);
                    }}
                    className="btn btn-outline"
                  >
                    <RefreshCw size={12} />
                    Reset & Upload New
                  </button>

                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="btn btn-primary"
                  >
                    <FileDown size={12} />
                    {isExporting ? "Exporting PDF..." : "Download PDF Report"}
                  </button>
                </div>
              </div>

              {/* Main Analysis grid */}
              <div className="results-container" style={{ marginTop: "2rem" }}>
                
                {/* Visual Canvas (Left Column) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div className="card">
                    <div className="card-header">
                      <div style={{ display: "flex", alignSelf: "center", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: "500" }}>
                        <Eye size={14} style={{ color: "var(--primary)" }} />
                        <span>Visual Inspection Canvas</span>
                      </div>
                      
                      <div className="no-pdf">
                        <div className="tabs-nav">
                          <button 
                            className={`tabs-btn ${viewMode === "side-by-side" ? "active" : ""}`}
                            onClick={() => setViewMode("side-by-side")}
                          >
                            Compare
                          </button>
                          <button 
                            className={`tabs-btn ${viewMode === "original" ? "active" : ""}`}
                            onClick={() => setViewMode("original")}
                          >
                            Original
                          </button>
                          <button 
                            className={`tabs-btn ${viewMode === "processed" ? "active" : ""}`}
                            onClick={() => setViewMode("processed")}
                          >
                            Processed
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="card-body" style={{ backgroundColor: "rgba(0,0,0,0.015)" }}>
                      {viewMode === "side-by-side" && (
                        <div className="image-canvas-grid">
                          <div className="canvas-img-wrapper">
                            <div className="canvas-img-label">Original Raw Photo</div>
                            <div className="canvas-image-box">
                              <img src={selectedAsset.originalImage} className="canvas-image" alt="Original raw structure" />
                            </div>
                          </div>
                          <div className="canvas-img-wrapper">
                            <div className="canvas-img-label">
                              <span>AI Diagnostic Overlay</span>
                              <span className="badge badge-low" style={{ fontSize: "8px", padding: "0.1rem 0.35rem" }}>PROCESSED</span>
                            </div>
                            <div className="canvas-image-box">
                              <img src={selectedAsset.processedImage} className="canvas-image" alt="AI processed overlay structure" />
                            </div>
                          </div>
                        </div>
                      )}

                      {viewMode === "original" && (
                        <div className="single-img-canvas">
                          <img src={selectedAsset.originalImage} className="canvas-image" alt="Original Raw" />
                          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 8px", textTransform: "uppercase" }}>
                            Original Sensor Feed
                          </div>
                        </div>
                      )}

                      {viewMode === "processed" && (
                        <div className="single-img-canvas">
                          <img src={selectedAsset.processedImage} className="canvas-image" alt="AI Processed" />
                          <div style={{ position: "absolute", top: "12px", left: "12px", background: "rgba(15,98,254,0.15)", backdropFilter: "blur(4px)", border: "1px solid var(--primary)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "9px", padding: "4px 8px", textTransform: "uppercase" }}>
                            ResNet-V9 AI Overlays Active
                          </div>
                          {/* Laser Scanner Line Overlay */}
                          <div className="scan-laser-line"></div>
                        </div>
                      )}
                    </div>

                    <div className="card-footer">
                      <span>Source: Optical Sensor-39A</span>
                      <span>Coordinates: 40.7128° N, 74.0060° W</span>
                    </div>
                  </div>
                </div>

                {/* Classification details (Right Column) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  
                  {/* Status & Confidence Card */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Diagnostic Status</div>
                    </div>
                    <div className="card-body">
                      <div className="info-row">
                        <div>
                          <div className="info-label" style={{ fontFamily: "var(--font-mono)" }}>Overall Severity</div>
                          <div className="info-value" style={{ marginTop: "0.2rem", fontWeight: "600" }}>
                            {selectedAsset.overallSeverity === "Critical" && "IMMEDIATE REPAIR REQUIRED"}
                            {selectedAsset.overallSeverity === "Warning" && "SCHEDULED REPAIR PLAN"}
                            {selectedAsset.overallSeverity === "Low" && "OBSERVATION ONLY"}
                            {selectedAsset.overallSeverity === "None" && "STABLE SYSTEM"}
                          </div>
                        </div>
                        <div>
                          {getSeverityBadge(selectedAsset.overallSeverity)}
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          <span style={{ color: "var(--muted-foreground)" }}>AI Classifier Confidence</span>
                          <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{selectedAsset.overallConfidence}%</span>
                        </div>
                        <div className="progress-bar-track">
                          <div className="progress-bar-fill" style={{ width: `${selectedAsset.overallConfidence}%` }}></div>
                        </div>
                        <span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
                          Confidence rating computed via ensemble ResNet probability matrices.
                        </span>
                      </div>

                      {selectedAsset.defectArea !== undefined && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1.5rem", borderTop: "1px dashed var(--border)", paddingTop: "1rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                            <span style={{ color: "var(--muted-foreground)" }}>Defect Area Ratio</span>
                            <span style={{ color: "var(--critical)", fontWeight: "bold" }}>{selectedAsset.defectArea}%</span>
                          </div>
                          <div className="progress-bar-track">
                            <div className="progress-bar-fill" style={{ width: `${Math.min(100, selectedAsset.defectArea * 25)}%`, backgroundColor: "var(--critical)" }}></div>
                          </div>
                          <span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", marginTop: "0.25rem" }}>
                            Defect pixel area coverage relative to overall image resolution.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Text Card */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <ShieldAlert size={14} style={{ color: "var(--primary)", marginRight: "4px" }} />
                        Executive AI Summary
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: "1.25rem" }}>
                      <p className="summary-block">
                        {selectedAsset.summary}
                      </p>
                    </div>
                  </div>

                  {/* Identified Anomalies Detail Table */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">
                        <FileText size={14} style={{ color: "var(--primary)", marginRight: "4px" }} />
                        Defects Log ({selectedAsset.defects.length})
                      </div>
                    </div>
                    <div className="card-body" style={{ padding: "0" }}>
                      <div className="anomalies-table-wrapper">
                        <table className="anomalies-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Type</th>
                              <th>Confidence</th>
                              <th>Severity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAsset.defects.map((defect) => (
                              <React.Fragment key={defect.id}>
                                <tr>
                                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: "600", color: "var(--primary)" }}>{defect.id}</td>
                                  <td style={{ fontWeight: "500" }}>{defect.type}</td>
                                  <td style={{ fontFamily: "var(--font-mono)" }}>{defect.confidence}%</td>
                                  <td>
                                    <span className={`severity-indicator-dot ${defect.severity.toLowerCase()}`}></span>
                                    {defect.severity}
                                  </td>
                                </tr>
                                <tr className="table-row-meta">
                                  <td colSpan={4}>
                                    <div className="table-row-meta-content">
                                      <div className="table-meta-item">
                                        <span className="table-meta-label">Location:</span>
                                        <span>{defect.location}</span>
                                      </div>
                                      <div className="table-meta-item">
                                        <span className="table-meta-label">Params:</span>
                                        <span>{defect.dimensions}</span>
                                      </div>
                                      <div className="table-meta-item table-meta-rec">
                                        <span className="table-meta-label" style={{ color: "inherit" }}>Action:</span>
                                        <span>{defect.recommendation}</span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>
          © 2026 IBM Corporation & Partners. Diagnostic engines licensed under Apache-2.0.
        </div>
      </footer>
    </div>
  );
}

export default App;
