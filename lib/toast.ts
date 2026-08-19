import toast from 'react-hot-toast';

function vibrate(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Ignorar errores de vibración
    }
  }
}

export const showToast = {
  success: (message: string) => {
    vibrate(50); // Vibración corta
    toast.success(message, {
      style: {
        background: '#00d65f',
        color: '#fff',
        fontWeight: 'bold',
        borderRadius: '16px',
        padding: '12px 16px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#00d65f',
      },
    });
  },
  error: (message: string) => {
    vibrate([50, 100, 50]); // Vibración doble de error
    toast.error(message, {
      style: {
        background: '#ef4444',
        color: '#fff',
        fontWeight: 'bold',
        borderRadius: '16px',
        padding: '12px 16px',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    });
  },
  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#101010',
        color: '#fff',
        fontWeight: 'bold',
        borderRadius: '16px',
      },
    });
  },
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  }
};
