
import React, { useRef } from "react";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (scenarios: Array<{title: string, content: string}>) => void;
}

const parseGherkin = (text: string): Array<{title: string, content: string}> => {
  // Very simple parser: each Scenario is split, and the "Scenario" line becomes title
  const lines = text.split("\n");
  let blocks: Array<{title: string, content: string}> = [];
  let acc: string[] = [];
  let title = "İsimsiz Senaryo";
  lines.forEach((line, idx) => {
    if (line.trim().toLowerCase().startsWith("scenario:")) {
      if (acc.length > 0) {
        blocks.push({
          title,
          content: acc.join("\n")
        });
        acc = [];
      }
      title = line.replace(/^Scenario:/i, "").trim() || "İsimsiz Senaryo";
    }
    acc.push(line);
    if (idx === lines.length - 1 && acc.length > 0) {
      blocks.push({
        title,
        content: acc.join("\n")
      });
    }
  });
  // Filter out empty blocks
  return blocks.filter(b => b.content.trim());
};

const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onImport }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImport = () => {
    const value = textareaRef.current?.value.trim();
    if (!value) return;
    const scenarios = parseGherkin(value);
    if (scenarios.length > 0) {
      onImport(scenarios);
      onClose();
    }
  };

  if (!open) return null;
  return (
    <div className="fixed z-50 inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="font-semibold mb-2">Gherkin Feature/Senaryo İçe Aktar</h3>
        <textarea
          ref={textareaRef}
          rows={8}
          className="w-full border rounded p-2 mb-4 bg-gray-50 text-sm"
          placeholder='Ör: Feature: Hesap İşlemleri
  Scenario: Para yatırma
    Given banka hesabımda "0" TL var
    When "500" TL yatırırsam
    Then banka hesabımda "500" TL olur'
        />
        <div className="flex gap-2 justify-end">
          <button className="secondary-button" onClick={onClose}>İptal</button>
          <button className="primary-button" onClick={handleImport}>İçe Aktar</button>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;

