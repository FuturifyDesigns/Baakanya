import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function MediaAdjuster({
  label,
  file,
  onFile,
  crop,
  onCrop,
  shape = "square",
  optional = true,
}) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <section className="media-adjuster">
      <div className="media-adjuster-copy">
        <span className="kicker">
          {optional ? "OPTIONAL BRANDING" : "PHOTO"}
        </span>
        <h3>{label}</h3>
        <p>Upload an image, then adjust its crop and zoom before download.</p>
        <label className="btn btn-outline media-upload-button">
          <ImagePlus /> {file ? "Replace image" : "Choose image"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => onFile(event.target.files?.[0] || null)}
          />
        </label>
        {file && (
          <button
            className="plain-button"
            type="button"
            onClick={() => onFile(null)}
          >
            <X /> Remove image
          </button>
        )}
      </div>
      <div className="media-crop-panel">
        <div className={`media-crop-preview ${shape}`}>
          {preview ? (
            <img
              src={preview}
              alt="Crop preview"
              style={{
                transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})`,
              }}
            />
          ) : (
            <span>No image selected</span>
          )}
        </div>
        {file && (
          <div className="crop-controls">
            <label>
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={crop.zoom}
                onChange={(event) =>
                  onCrop({ ...crop, zoom: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Left / right
              <input
                type="range"
                min="-40"
                max="40"
                value={crop.x}
                onChange={(event) =>
                  onCrop({ ...crop, x: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Up / down
              <input
                type="range"
                min="-40"
                max="40"
                value={crop.y}
                onChange={(event) =>
                  onCrop({ ...crop, y: Number(event.target.value) })
                }
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
