export const showToast = (msg: string) => {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: 'rgba(20, 20, 25, 0.95)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '100px',
    zIndex: '9999',
    fontFamily: 'Inter, "Noto Sans Arabic", sans-serif',
    fontWeight: '500',
    fontSize: '14px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    opacity: '0',
    pointerEvents: 'none'
  });
  
  document.body.appendChild(el);
  
  // Trigger animation
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
  });
  
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => el.remove(), 300);
  }, 3000);
};
