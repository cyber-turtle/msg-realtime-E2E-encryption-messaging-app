import { FiX, FiDownload, FiExternalLink } from 'react-icons/fi';

const MediaViewer = ({ mediaUrl, fileName, onClose }) => {
  if (!mediaUrl) return null;

  return (
    <div className="modal-overlay media-viewer-overlay" onClick={onClose}>
      <div className="media-viewer-content" onClick={(e) => e.stopPropagation()}>
        <div className="media-viewer-header">
          <div className="media-info">
            <span className="file-name">{fileName || 'Media'}</span>
          </div>
          <div className="media-actions">
            <a href={mediaUrl} download={fileName} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Open Original">
              <FiExternalLink size={20} />
            </a>
            <button onClick={onClose} className="btn-close">
              <FiX size={24} />
            </button>
          </div>
        </div>
        
        <div className="media-display">
          <img src={mediaUrl} alt={fileName} />
        </div>
      </div>
    </div>
  );
};

export default MediaViewer;
