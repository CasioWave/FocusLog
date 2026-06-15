export const getDeviceId = () => {
  let id = localStorage.getItem('focuslog_device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('focuslog_device_id', id);
  }
  return id;
};
