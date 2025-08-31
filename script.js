document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('helloButton');
  if (!button) return;

  button.addEventListener('click', () => {
    alert('ようこそ！');
  });
});


