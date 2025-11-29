export default function Modal({ children, className = '' }) {
  return (
    <div className="modal-overlay">
      <div className={`modal ${className}`}>
        {children}
      </div>
    </div>
  )
} 