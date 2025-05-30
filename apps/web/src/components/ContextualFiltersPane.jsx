import React from 'react'
import PropTypes from 'prop-types'

function ContextualFiltersPane({
  title = 'Filters',
  items = [],
  hoveredId = null,
  selectedId = null,
  onHover = () => {},
  onClick = () => {},
}) {
  return (
    <div className="contextual-filters-pane" style={{ padding: 16, background: '#fff', borderRight: '1px solid #eee', minWidth: 220 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {items.length === 0 ? (
        <div style={{ color: '#888', fontStyle: 'italic' }}>No items to display</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map(item => (
            <li key={item.id} style={{ marginBottom: 8 }}>
              <button
                type="button"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: item.id === selectedId
                    ? '#007bff'
                    : item.id === hoveredId
                    ? '#e6f0ff'
                    : '#f7f7f7',
                  color: item.id === selectedId ? '#fff' : '#222',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: item.id === selectedId ? 'bold' : 'normal',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={() => onHover(item.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onClick(item.id)}
              >
                {item.name || item.label || item.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

ContextualFiltersPane.propTypes = {
  title: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    label: PropTypes.string,
  })),
  hoveredId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onHover: PropTypes.func,
  onClick: PropTypes.func,
}

export default ContextualFiltersPane 