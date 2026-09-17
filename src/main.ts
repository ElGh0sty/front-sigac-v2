import { bootstrapApplication } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

const formatConsoleArgs = (args: unknown[]) => {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack || ''}`.trim();
      }
      if (typeof arg === 'string') return arg;
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    })
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1200);
};

const showSweetAlertFromConsole = (level: 'warn' | 'error', args: unknown[]) => {
  const message = formatConsoleArgs(args);
  if (!message.trim()) return;

  Swal.fire({
    icon: level === 'error' ? 'error' : 'warning',
    title: level === 'error' ? 'Error de la aplicación' : 'Advertencia',
    html: `<pre style="white-space: pre-wrap; word-break: break-word; text-align: left; font-size: 12px; margin: 0;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#4f46e5',
    allowOutsideClick: false,
    width: 700,
    customClass: {
      popup: 'swal2-console-alert'
    }
  });
};

console.log = () => {};
console.info = () => {};
console.debug = () => {};
console.warn = (...args: unknown[]) => showSweetAlertFromConsole('warn', args);
console.error = (...args: unknown[]) => showSweetAlertFromConsole('error', args);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => showSweetAlertFromConsole('error', [err]));
