async function loadAndRenderTemplate(templateName) {
  const res = await fetch(`/api/issues/templates/${templateName}`);
  const schema = await res.json();

  const container = document.getElementById("form-container");
  container.innerHTML = `<h2>${schema.name || ''}</h2><p>${schema.description || ''}</p>`;

  const form = document.createElement("form");

  // Store labels and title prefix in data attributes
  form.dataset.labels = JSON.stringify(schema.labels || []);
  form.dataset.titlePrefix = schema.title || "";

  // Title Input
  form.innerHTML += `
    <div class="field">
      <label>Issue Title</label>
      <input type="text" name="__title" value="${schema.title || ''}" required />
    </div>
  `;

  // Render Body Elements
  (schema.body || []).forEach((field, index) => {
    const id = field.id || `field_${index}`;
    const attrs = field.attributes || {};
    const req = field.validations?.required ? "required" : "";

    if (field.type === "markdown") {
      form.innerHTML += `<div>${attrs.value}</div>`;
    } else if (field.type === "input") {
      form.innerHTML += `
        <div class="field">
          <label>${attrs.label}</label>
          <input type="text" name="${id}" placeholder="${attrs.placeholder || ''}" ${req} />
        </div>`;
    } else if (field.type === "textarea") {
      form.innerHTML += `
        <div class="field">
          <label>${attrs.label}</label>
          <textarea name="${id}" placeholder="${attrs.placeholder || ''}" ${req}></textarea>
        </div>`;
    } else if (field.type === "dropdown") {
      const opts = (attrs.options || []).map(o => `<option value="${o}">${o}</option>`).join("");
      form.innerHTML += `
        <div class="field">
          <label>${attrs.label}</label>
          <select name="${id}" ${req}>${opts}</select>
        </div>`;
    }
  });

  form.innerHTML += `<button type="submit">Submit Issue</button>`;
  container.appendChild(form);

  form.addEventListener("submit", handleSubmit);
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const title = formData.get("__title");
  const labels = JSON.parse(form.dataset.labels);

  // Compile Form Responses into Markdown
  let markdownBody = "";
  for (const [key, val] of formData.entries()) {
    if (key === "__title") continue;
    markdownBody += `### ${key}\n${val}\n\n`;
  }

  // Submit Payload
  const response = await fetch("/api/issues", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, body: markdownBody, labels })
  });

  if (response.ok) {
    const issue = await response.json();
    alert(`Issue created: ${issue.html_url}`);
  }
}
