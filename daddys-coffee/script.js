const header = document.querySelector("[data-header]");
const cartList = document.querySelector("[data-cart-list]");
const commentForm = document.querySelector("[data-comment-form]");
const comments = document.querySelector("[data-comments]");
const cart = [];

const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

const renderCart = () => {
  cartList.innerHTML = "";
  if (cart.length === 0) {
    const item = document.createElement("li");
    item.textContent = "尚未選擇商品";
    cartList.append(item);
    return;
  }

  cart.forEach((name) => {
    const item = document.createElement("li");
    item.textContent = name;
    cartList.append(item);
  });
};

document.querySelectorAll("[data-cart]").forEach((button) => {
  button.addEventListener("click", () => {
    cart.push(button.dataset.cart);
    renderCart();
  });
});

commentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(commentForm);
  const name = String(form.get("name") || "").trim();
  const message = String(form.get("message") || "").trim();
  if (!name || !message) return;

  const article = document.createElement("article");
  const strong = document.createElement("strong");
  const paragraph = document.createElement("p");
  strong.textContent = name;
  paragraph.textContent = message;
  article.append(strong, paragraph);
  comments.prepend(article);
  commentForm.reset();
});

updateHeader();
renderCart();
window.addEventListener("scroll", updateHeader, { passive: true });
