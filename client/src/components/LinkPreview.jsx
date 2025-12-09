import { useState, useEffect } from 'react';
import api from '../api/axios';

const LinkPreview = ({ url }) => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await api.get(`/utils/metadata?url=${encodeURIComponent(url)}`);
        if (response.data.title || response.data.image) {
          setMetadata(response.data);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  if (loading) return <span className="link-loading">Loading preview...</span>;
  if (error || !metadata) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview-card">
      {metadata.image && (
        <div className="preview-image">
          <img src={metadata.image} alt={metadata.title} />
        </div>
      )}
      <div className="preview-content">
        <h4 className="preview-title">{metadata.title}</h4>
        {metadata.description && (
          <p className="preview-description">{metadata.description.substring(0, 100)}...</p>
        )}
        <span className="preview-site">{metadata.siteName || new URL(url).hostname}</span>
      </div>
    </a>
  );
};

export default LinkPreview;
