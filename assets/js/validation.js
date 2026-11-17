const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = "868fc233-ba7c-40cc-80e0-a585da75b243";

// Регулярні вирази для формату email і номера телефону.
const REGEX_PHONE = /^\+380[0-9]{9}$/;
const REGEX_EMAIL = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

// Отримуємо елементи форми та явно повідомляємо про помилку розмітки.
function getRequiredElement(id, ElementType) {
  const element = document.getElementById(id);

  if (!(element instanceof ElementType)) {
    throw new Error(`Не знайдено елемент форми з id="${id}".`);
  }

  return element;
}

const form = getRequiredElement("contact-form", HTMLFormElement);
const nameInput = getRequiredElement("contact-name", HTMLInputElement);
const emailInput = getRequiredElement("contact-email", HTMLInputElement);
const phoneInput = getRequiredElement("contact-phone", HTMLInputElement);
const subjectInput = getRequiredElement("contact-subject", HTMLSelectElement);
const messageInput = getRequiredElement("contact-message", HTMLTextAreaElement);
const agreementInput = getRequiredElement("contact-agreement", HTMLInputElement);
const botcheckInput = getRequiredElement("contact-botcheck", HTMLInputElement);

const nameError = getRequiredElement("contact-name-error", HTMLParagraphElement);
const emailError = getRequiredElement("contact-email-error", HTMLParagraphElement);
const phoneError = getRequiredElement("contact-phone-error", HTMLParagraphElement);
const phoneHint = getRequiredElement("contact-phone-hint", HTMLParagraphElement);
const subjectError = getRequiredElement("contact-subject-error", HTMLParagraphElement);
const messageError = getRequiredElement("contact-message-error", HTMLParagraphElement);
const agreementError = getRequiredElement("contact-agreement-error", HTMLParagraphElement);
const formStatus = getRequiredElement("contact-form-status", HTMLParagraphElement);
const successModal = getRequiredElement("success-modal", HTMLDivElement);
const successModalClose = getRequiredElement("success-modal-close", HTMLButtonElement);
const submitButton = form.querySelector('button[type="submit"]');

if (!(submitButton instanceof HTMLButtonElement)) {
  throw new Error("Не знайдено кнопку надсилання форми.");
}

const originalSubmitButtonText = submitButton.textContent;
let isSubmitting = false;

// Скидаємо попередній текст і стилі стану поля.
function clearError(input, errorElement) {
  errorElement.textContent = "";
  errorElement.classList.add("hidden");
  errorElement.classList.remove("mt-1", "text-sm", "text-red-700");
  input.classList.remove("!border-red-500", "!border-green-700");
  input.setAttribute("aria-invalid", "false");
}

// Показуємо повідомлення про помилку та підсвічуємо поле.
function showError(input, errorElement, message) {
  if (errorElement.textContent !== message) {
    errorElement.textContent = message;
  }

  errorElement.classList.remove("hidden");
  errorElement.classList.add("mt-1", "text-sm", "text-red-700");
  input.classList.remove("!border-green-700");
  input.classList.add("!border-red-500");
  input.setAttribute("aria-invalid", "true");
}

// Прибираємо повідомлення про помилку та позначаємо поле як коректне.
function showSuccess(input, errorElement) {
  clearError(input, errorElement);
  input.classList.add("!border-green-700");
  input.setAttribute("aria-invalid", "false");
}

function validateName() {
  if (nameInput.value.trim().length < 2) {
    showError(nameInput, nameError, "Введіть ім'я (мінімум 2 символи)");
    return false;
  }

  showSuccess(nameInput, nameError);
  return true;
}

function validateEmail() {
  if (!REGEX_EMAIL.test(emailInput.value.trim())) {
    showError(emailInput, emailError, "Введіть коректну електронну адресу");
    return false;
  }

  showSuccess(emailInput, emailError);
  return true;
}

// Нормалізуємо лише знайомі формати; інші значення залишаємо без змін.
function normalizePhone(value) {
  const compactValue = value.replace(/[ \-()]/g, "");

  if (/^0[0-9]{9}$/.test(compactValue)) {
    return `+38${compactValue}`;
  }

  if (/^380[0-9]{9}$/.test(compactValue)) {
    return `+${compactValue}`;
  }

  if (REGEX_PHONE.test(compactValue)) {
    return compactValue;
  }

  return value;
}

// Показуємо підказку лише тоді, коли значення справді змінилося.
function normalizePhoneField() {
  const originalValue = phoneInput.value;
  const normalizedValue = normalizePhone(originalValue);

  if (normalizedValue === originalValue) {
    return;
  }

  phoneInput.value = normalizedValue;
  phoneHint.textContent = "Номер приведено до формату +380XXXXXXXXX";
  phoneHint.classList.remove("hidden");
}

function validatePhone() {
  if (!REGEX_PHONE.test(phoneInput.value)) {
    showError(phoneInput, phoneError, "Введіть номер у форматі +380XXXXXXXXX");
    return false;
  }

  showSuccess(phoneInput, phoneError);
  return true;
}

function validateSubject() {
  if (subjectInput.value === "") {
    showError(subjectInput, subjectError, "Оберіть тему звернення");
    return false;
  }

  showSuccess(subjectInput, subjectError);
  return true;
}

function validateMessage() {
  if (messageInput.value.trim().length < 10) {
    showError(messageInput, messageError, "Повідомлення має містити щонайменше 10 символів");
    return false;
  }

  showSuccess(messageInput, messageError);
  return true;
}

function validateAgreement() {
  if (!agreementInput.checked) {
    showError(agreementInput, agreementError, "Потрібна ваша згода на обробку даних");
    return false;
  }

  showSuccess(agreementInput, agreementError);
  return true;
}

// Зберігаємо стан взаємодії та перевірку для кожного поля.
const fields = [
  { input: nameInput, error: nameError, validate: validateName, eventName: "input", touched: false },
  { input: emailInput, error: emailError, validate: validateEmail, eventName: "input", touched: false },
  { input: phoneInput, error: phoneError, validate: validatePhone, eventName: "input", touched: false },
  { input: subjectInput, error: subjectError, validate: validateSubject, eventName: "change", touched: false },
  { input: messageInput, error: messageError, validate: validateMessage, eventName: "input", touched: false },
  { input: agreementInput, error: agreementError, validate: validateAgreement, eventName: "change", touched: false }
];

fields.forEach((field) => {
  // Перша втрата фокуса позначає поле як відвідане й запускає перевірку.
  field.input.addEventListener("blur", () => {
    field.touched = true;

    if (field.input === phoneInput) {
      normalizePhoneField();
    }

    field.validate();
  });

  // Після першої взаємодії показуємо актуальний стан під час редагування.
  field.input.addEventListener(field.eventName, () => {
    if (field.touched) {
      field.validate();
    }
  });
});

// Прибираємо підказку, щойно користувач знову редагує номер.
phoneInput.addEventListener("input", () => {
  phoneHint.textContent = "";
  phoneHint.classList.add("hidden");
});

// Відновлюємо значення, помилки та стани форми до початкового вигляду.
function resetFormState() {
  form.reset();

  fields.forEach((field) => {
    clearError(field.input, field.error);
    field.input.setAttribute("aria-invalid", "false");
    field.touched = false;
  });

  phoneHint.textContent = "";
  phoneHint.classList.add("hidden");
  formStatus.textContent = "";
}

// Відкриваємо модальне вікно лише один раз і переносимо в нього фокус.
function openSuccessModal() {
  if (!successModal.classList.contains("hidden")) {
    return;
  }

  successModal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  successModalClose.focus();
}

// Закриваємо модальне вікно та повертаємо фокус до кнопки надсилання.
function closeSuccessModal() {
  if (successModal.classList.contains("hidden")) {
    return;
  }

  successModal.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
  submitButton.focus();
}

successModalClose.addEventListener("click", closeSuccessModal);

successModal.addEventListener("click", (event) => {
  if (event.target === successModal) {
    closeSuccessModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (successModal.classList.contains("hidden")) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    closeSuccessModal();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = Array.from(
    successModal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => element instanceof HTMLElement && element.getClientRects().length > 0);

  if (focusableElements.length === 0) {
    event.preventDefault();
    successModalClose.focus();
    return;
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  const focusIsInsideModal = successModal.contains(document.activeElement);

  if (event.shiftKey && (document.activeElement === firstFocusable || !focusIsInsideModal)) {
    event.preventDefault();
    lastFocusable.focus();
  } else if (!event.shiftKey && (document.activeElement === lastFocusable || !focusIsInsideModal)) {
    event.preventDefault();
    firstFocusable.focus();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting || !successModal.classList.contains("hidden") || botcheckInput.value) {
    return;
  }

  formStatus.textContent = "";

  // Спроба надсилання позначає всі поля як відвідані та перевіряє кожне.
  fields.forEach((field) => {
    field.touched = true;
  });

  normalizePhoneField();

  const validationResults = fields.map((field) => ({
    input: field.input,
    isValid: field.validate()
  }));

  const firstInvalidField = validationResults.find((result) => !result.isValid);

  if (firstInvalidField) {
    firstInvalidField.input.focus();
    return;
  }

  isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = "Надсилання…";

  const formData = {
    access_key: WEB3FORMS_ACCESS_KEY,
    name: nameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    message: messageInput.value,
    subject: subjectInput.selectedOptions[0].textContent,
    from_name: "Мій похід — форма контактів",
    agreement: "так"
  };

  try {
    const response = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(formData)
    });
    const result = await response.json();

    if (!response.ok || result.success !== true) {
      throw new Error("Web3Forms не підтвердив надсилання.");
    }

    resetFormState();
    openSuccessModal();
  } catch {
    formStatus.textContent = "Не вдалося надіслати повідомлення. Перевірте з'єднання й спробуйте ще раз.";
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = originalSubmitButtonText;
  }
});
