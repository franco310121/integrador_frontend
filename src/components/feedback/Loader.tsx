import './Loader.css';

export default function Loader({ message }: { message?: string } = {}) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-4 gap-2">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">{message || 'Loading...'}</span>
      </div>
      {message && <span className="small text-muted">{message}</span>}
    </div>
  );
}
