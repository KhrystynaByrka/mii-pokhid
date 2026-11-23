(function () {
  'use strict';

  var PRICES = {
    routes: {
      polonyna: { label: 'Полонина', fee: 300 },
      nesamovyte: { label: 'Озеро Несамовите', fee: 500 },
      shpytsi: { label: 'Шпиці', fee: 600 }
    },
    lodging: {
      tent: { label: 'Намет', perNight: 100 },
      shelter: { label: 'Притулок', perNight: 250 },
      guesthouse: { label: 'Садиба', perNight: 700 }
    },
    services: {
      guidePerDay: 2000,
      gearPerPersonPerDay: 300,
      mealsPerPersonPerDay: 400
    }
  };

  var LIMITS = {
    days: { min: 1, max: 14 },
    people: { min: 1, max: 20 }
  };

  var ERROR_MESSAGES = {
    route: 'Оберіть маршрут',
    lodging: 'Оберіть тип проживання',
    daysEmpty: 'Вкажіть кількість днів',
    daysInvalid: 'Вкажіть ціле число від 1 до 14',
    peopleEmpty: 'Вкажіть кількість людей',
    peopleInvalid: 'Вкажіть ціле число від 1 до 20'
  };

  var currencyFormatter = new Intl.NumberFormat('uk-UA');

  var elementIds = [
    'calc-form',
    'calc-route',
    'calc-days',
    'calc-people',
    'calc-lodging',
    'calc-guide',
    'calc-gear',
    'calc-meals',
    'calc-route-error',
    'calc-days-error',
    'calc-people-error',
    'calc-lodging-error',
    'calc-total',
    'calc-breakdown',
    'calc-status'
  ];

  var elements = {};
  var missingElements = [];

  for (var i = 0; i < elementIds.length; i += 1) {
    var id = elementIds[i];
    var el = document.getElementById(id);
    if (!el) {
      missingElements.push(id);
    } else {
      elements[id] = el;
    }
  }

  if (missingElements.length > 0) {
    for (var m = 0; m < missingElements.length; m += 1) {
      console.warn('Trip calculator: missing element #' + missingElements[m]);
    }
    return;
  }

  var form = elements['calc-form'];
  var routeInput = elements['calc-route'];
  var daysInput = elements['calc-days'];
  var peopleInput = elements['calc-people'];
  var lodgingInput = elements['calc-lodging'];
  var guideInput = elements['calc-guide'];
  var gearInput = elements['calc-gear'];
  var mealsInput = elements['calc-meals'];
  var routeError = elements['calc-route-error'];
  var daysError = elements['calc-days-error'];
  var peopleError = elements['calc-people-error'];
  var lodgingError = elements['calc-lodging-error'];
  var totalOutput = elements['calc-total'];
  var breakdownOutput = elements['calc-breakdown'];
  var statusOutput = elements['calc-status'];

  var touched = {
    route: false,
    days: false,
    people: false,
    lodging: false
  };

  function formatMoney(amount) {
    return currencyFormatter.format(amount) + ' грн';
  }

  function setFieldError(field, errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    field.setAttribute('aria-invalid', 'true');
    field.classList.remove('!border-success');
    field.classList.add('!border-error');
  }

  function setFieldSuccess(field, errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
    field.setAttribute('aria-invalid', 'false');
    field.classList.remove('!border-error');
    field.classList.add('!border-success');
  }

  function clearFieldState(field, errorElement) {
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
    field.setAttribute('aria-invalid', 'false');
    field.classList.remove('!border-error');
    field.classList.remove('!border-success');
  }

  function validateSelect(value, allowedMap) {
    if (value === '') {
      return { valid: false, reason: 'empty' };
    }
    if (!Object.prototype.hasOwnProperty.call(allowedMap, value)) {
      return { valid: false, reason: 'invalid' };
    }
    return { valid: true, value: value };
  }

  function validateNumberInput(input, limits) {
    if (input.validity && input.validity.badInput) {
      return { valid: false, reason: 'invalid' };
    }

    var rawValue = input.value;
    if (rawValue === '') {
      return { valid: false, reason: 'empty' };
    }

    var numericValue = input.valueAsNumber;
    if (!Number.isFinite(numericValue) || !Number.isInteger(numericValue)) {
      return { valid: false, reason: 'invalid' };
    }

    if (numericValue < limits.min || numericValue > limits.max) {
      return { valid: false, reason: 'invalid' };
    }

    return { valid: true, value: numericValue };
  }

  function getValidationState() {
    return {
      route: validateSelect(routeInput.value, PRICES.routes),
      days: validateNumberInput(daysInput, LIMITS.days),
      people: validateNumberInput(peopleInput, LIMITS.people),
      lodging: validateSelect(lodgingInput.value, PRICES.lodging)
    };
  }

  function applyFieldUI(fieldName, field, errorElement, validation, messages) {
    if (!touched[fieldName]) {
      clearFieldState(field, errorElement);
      return;
    }

    if (validation.valid) {
      setFieldSuccess(field, errorElement);
      return;
    }

    var message = messages.invalid;
    if (validation.reason === 'empty' && messages.empty) {
      message = messages.empty;
    }
    setFieldError(field, errorElement, message);
  }

  function renderBreakdownMessage(message) {
    while (breakdownOutput.firstChild) {
      breakdownOutput.removeChild(breakdownOutput.firstChild);
    }
    var li = document.createElement('li');
    li.textContent = message;
    breakdownOutput.appendChild(li);
  }

  function renderBreakdown(items) {
    while (breakdownOutput.firstChild) {
      breakdownOutput.removeChild(breakdownOutput.firstChild);
    }
    for (var i = 0; i < items.length; i += 1) {
      var li = document.createElement('li');
      li.textContent = items[i];
      breakdownOutput.appendChild(li);
    }
  }

  function calculate(params) {
    var routeInfo = PRICES.routes[params.route];
    var lodgingInfo = PRICES.lodging[params.lodging];
    var nights = params.days - 1;

    var routeCost = params.people * routeInfo.fee;
    var lodgingCost = params.people * nights * lodgingInfo.perNight;
    var mealsCost = params.meals ? params.people * params.days * PRICES.services.mealsPerPersonPerDay : 0;
    var guideCost = params.guide ? params.days * PRICES.services.guidePerDay : 0;
    var gearCost = params.gear ? params.people * params.days * PRICES.services.gearPerPersonPerDay : 0;

    var total = routeCost + lodgingCost + mealsCost + guideCost + gearCost;

    var items = [];
    items.push('Маршрут: ' + routeInfo.label + ' — ' + formatMoney(routeCost));
    items.push('Проживання: ' + lodgingInfo.label + ' (' + nights + ' ноч.) — ' + formatMoney(lodgingCost));

    if (params.guide) {
      items.push('Гід — ' + formatMoney(guideCost));
    }
    if (params.gear) {
      items.push('Оренда спорядження — ' + formatMoney(gearCost));
    }
    if (params.meals) {
      items.push('Харчування — ' + formatMoney(mealsCost));
    }

    items.push('Разом — ' + formatMoney(total));

    return {
      total: total,
      items: items
    };
  }

  function pluralize(n, forms) {
    var mod10 = n % 10;
    var mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return forms[0];
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return forms[1];
    }
    return forms[2];
  }

  function buildStatusSummary(params) {
    var routeInfo = PRICES.routes[params.route];
    var lodgingInfo = PRICES.lodging[params.lodging];
    var dayWord = pluralize(params.days, ['день', 'дні', 'днів']);
    var peopleWord = pluralize(params.people, ['людина', 'людини', 'людей']);
    var parts = [
      routeInfo.label + ', ' + params.days + ' ' + dayWord + ', ' + params.people + ' ' + peopleWord,
      'проживання: ' + lodgingInfo.label.toLowerCase()
    ];

    var services = [];
    if (params.guide) {
      services.push('гід');
    }
    if (params.gear) {
      services.push('оренда спорядження');
    }
    if (params.meals) {
      services.push('харчування');
    }

    if (services.length > 0) {
      parts.push('послуги: ' + services.join(', '));
    } else {
      parts.push('без додаткових послуг');
    }

    return parts.join('; ') + '.';
  }

  function hasTouchedErrors(state) {
    return (touched.route && !state.route.valid) ||
      (touched.days && !state.days.valid) ||
      (touched.people && !state.people.valid) ||
      (touched.lodging && !state.lodging.valid);
  }

  function update() {
    var state = getValidationState();

    applyFieldUI('route', routeInput, routeError, state.route, {
      empty: ERROR_MESSAGES.route,
      invalid: ERROR_MESSAGES.route
    });
    applyFieldUI('days', daysInput, daysError, state.days, {
      empty: ERROR_MESSAGES.daysEmpty,
      invalid: ERROR_MESSAGES.daysInvalid
    });
    applyFieldUI('people', peopleInput, peopleError, state.people, {
      empty: ERROR_MESSAGES.peopleEmpty,
      invalid: ERROR_MESSAGES.peopleInvalid
    });
    applyFieldUI('lodging', lodgingInput, lodgingError, state.lodging, {
      empty: ERROR_MESSAGES.lodging,
      invalid: ERROR_MESSAGES.lodging
    });

    var allValid = state.route.valid && state.days.valid && state.people.valid && state.lodging.valid;

    if (!allValid) {
      totalOutput.textContent = '—';
      if (hasTouchedErrors(state)) {
        renderBreakdownMessage('Виправте помилки у формі');
      } else {
        renderBreakdownMessage('Заповніть параметри походу');
      }
      statusOutput.textContent = '';
      return;
    }

    var params = {
      route: state.route.value,
      days: state.days.value,
      people: state.people.value,
      lodging: state.lodging.value,
      guide: Boolean(guideInput.checked),
      gear: Boolean(gearInput.checked),
      meals: Boolean(mealsInput.checked)
    };

    var result = calculate(params);

    if (!Number.isFinite(result.total) || result.total < 0) {
      totalOutput.textContent = '—';
      renderBreakdownMessage('Заповніть параметри походу');
      statusOutput.textContent = '';
      return;
    }

    totalOutput.textContent = formatMoney(result.total);
    renderBreakdown(result.items);
    statusOutput.textContent = buildStatusSummary(params);
  }

  function markTouched(fieldName) {
    touched[fieldName] = true;
  }

  routeInput.addEventListener('blur', function () {
    markTouched('route');
    update();
  });
  routeInput.addEventListener('change', function () {
    if (touched.route) {
      update();
    } else {
      update();
    }
  });

  daysInput.addEventListener('blur', function () {
    markTouched('days');
    update();
  });
  daysInput.addEventListener('input', function () {
    update();
  });

  peopleInput.addEventListener('blur', function () {
    markTouched('people');
    update();
  });
  peopleInput.addEventListener('input', function () {
    update();
  });

  lodgingInput.addEventListener('blur', function () {
    markTouched('lodging');
    update();
  });
  lodgingInput.addEventListener('change', function () {
    update();
  });

  guideInput.addEventListener('change', update);
  gearInput.addEventListener('change', update);
  mealsInput.addEventListener('change', update);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
  });

  update();
})();
