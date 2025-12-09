import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FiZoomIn, FiZoomOut, FiCheck, FiX } from 'react-icons/fi';
import { getCroppedImg } from '../utils/fileHelpers';

const ImageCropper = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="cropper-modal">
      <div className="cropper-container">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={onZoomChange}
        />
      </div>
      <div className="cropper-controls">
        <div className="zoom-slider">
          <FiZoomOut />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
          />
          <FiZoomIn />
        </div>
        <div className="cropper-actions">
          <button className="btn-cancel" onClick={onCancel}>
            <FiX size={20} />
          </button>
          <button className="btn-save" onClick={handleSave}>
            <FiCheck size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
