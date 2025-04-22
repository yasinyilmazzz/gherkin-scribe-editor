
import React, { useRef, useState } from "react";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (featureText: string) => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onImport }) => {
  const [fileError, setFileError] = useState<string | null>(null);
  const [featureText, setFeatureText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.type !== "text/plain") {
      setFileError("Sadece .feature veya .txt dosyası yükleyin.");
      return;
    }
    setFileError(null);
    const reader = new FileReader();
    reader.onload = e => {
      setFeatureText(e.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleImportClick = () => {
    if (!featureText.trim()) return setFileError("İçe aktarılacak bir içerik bulunamadı.");
    onImport(featureText);
    setFeatureText("");
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
      zIndex: 1000, background: "rgba(34,38,42,0.20)", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        width: 380, maxWidth: "92vw", background: "#fff", borderRadius: 8, boxShadow: "0 4px 32px #0001", padding: 24, display: "flex", flexDirection: "column", gap: 8, position: "relative"
      }}>
        <div style={{fontWeight: 600, fontSize: 17, marginBottom: 4}}>Senaryo İçe Aktar</div>
        <input
          type="file"
          accept=".feature,.txt"
          ref={fileInputRef}
          style={{marginBottom: 6}}
          onChange={e => {
            if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
          }}
        />
        <textarea
          value={featureText}
          onChange={e => setFeatureText(e.target.value)}
          placeholder='Alternatif olarak .feature içeriğini buraya yapıştırın...'
          style={{
            width: "100%", height: 110, border: "1px solid #e5e7eb", borderRadius: 5,
            padding: "8px", resize: "vertical", fontFamily: "monospace", fontSize: 14
          }}
        />
        {fileError && <div style={{color: "#ef4444", fontSize: 14, marginBottom: 4}}>{fileError}</div>}
        <div style={{display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6}}>
          <button onClick={onClose} style={{background: "#f3f4f6", border: "none", borderRadius: 5, padding: "8px 14px", fontWeight: 500, fontSize: 14, cursor: "pointer"}}>İptal</button>
          <button onClick={handleImportClick} style={{background: "#6366f1", color: "#fff", border: "none", borderRadius: 5, padding: "8px 15px", fontWeight: 500, fontSize: 14, cursor: "pointer"}}>İçe Aktar</button>
        </div>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, right: 12, background: "none", border: "none",
          fontSize: 19, color: "#aaa", cursor: "pointer", lineHeight: 1
        }} title="Kapat">&times;</button>
      </div>
    </div>
  );
};

export default ImportDialog;
