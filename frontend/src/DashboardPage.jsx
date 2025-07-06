// frontend/src/DashboardPage.jsx

const DashboardPage = () => {
  return (
    <div style={{ display: 'flex', width: '100%', gap: '2rem' }}>

      {/* Main Content Area (70%) */}
      <div style={{ flex: '0 1 70%' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Library</h2>
        
        {/* We will add the list of shows here later */}
        <div style={{ marginTop: '1rem', border: '1px dashed #cbd5e1', padding: '2rem', borderRadius: '0.25rem' }}>
          Library Cards
        </div>
        <button style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          marginTop: '1rem',
        }}>
          Create New Show
        </button>
      </div>

      {/* Quick Access Sidebar (30%) */}
      <div style={{ flex: '0 1 30%'} }>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Quick Access</h2>
        {/* We will add the pinned/recent items here later */}
        <div style={{ border: '1px dashed #cbd5e1', padding: '2rem', borderRadius: '0.25rem' }}>
          Quickstart Cards
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;