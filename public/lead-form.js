(function () {
  const countries = [
    { code: 'IN', label: 'India +91', dial: '91', minDigits: 10, maxDigits: 10 },
    { code: 'US', label: 'United States +1', dial: '1', minDigits: 10, maxDigits: 10 },
    { code: 'CA', label: 'Canada +1', dial: '1', minDigits: 10, maxDigits: 10 },
    { code: 'GB', label: 'United Kingdom +44', dial: '44', minDigits: 10, maxDigits: 10 },
    { code: 'AU', label: 'Australia +61', dial: '61', minDigits: 9, maxDigits: 9 },
    { code: 'SG', label: 'Singapore +65', dial: '65', minDigits: 8, maxDigits: 8 },
    { code: 'AE', label: 'UAE +971', dial: '971', minDigits: 9, maxDigits: 9 },
    { code: 'SA', label: 'Saudi Arabia +966', dial: '966', minDigits: 9, maxDigits: 9 },
    { code: 'ZA', label: 'South Africa +27', dial: '27', minDigits: 9, maxDigits: 9 },
    { code: 'PH', label: 'Philippines +63', dial: '63', minDigits: 10, maxDigits: 10 },
    { code: 'BR', label: 'Brazil +55', dial: '55', minDigits: 10, maxDigits: 11 },
    { code: 'DE', label: 'Germany +49', dial: '49', minDigits: 10, maxDigits: 11 },
    { code: 'FR', label: 'France +33', dial: '33', minDigits: 9, maxDigits: 9 },
    { code: 'MX', label: 'Mexico +52', dial: '52', minDigits: 10, maxDigits: 10 },
    { code: 'ID', label: 'Indonesia +62', dial: '62', minDigits: 9, maxDigits: 10 },
    { code: 'NZ', label: 'New Zealand +64', dial: '64', minDigits: 8, maxDigits: 9 },
    { code: 'PK', label: 'Pakistan +92', dial: '92', minDigits: 10, maxDigits: 10 },
    { code: 'BD', label: 'Bangladesh +880', dial: '880', minDigits: 10, maxDigits: 10 },
    { code: 'NG', label: 'Nigeria +234', dial: '234', minDigits: 10, maxDigits: 10 },
    { code: 'KE', label: 'Kenya +254', dial: '254', minDigits: 9, maxDigits: 9 },
    { code: 'MY', label: 'Malaysia +60', dial: '60', minDigits: 9, maxDigits: 10 },
    { code: 'TH', label: 'Thailand +66', dial: '66', minDigits: 9, maxDigits: 9 }
  ];

  function sanitizeDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizeWebsite(value) {
    let raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    raw = raw.replace(/^https?:\/\//, '');
    raw = raw.replace(/[/?#].*$/, '').replace(/\/+$/, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw)) return '';
    return `https://${raw}`;
  }

  function fillCountries(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = countries.map((item, index) => `<option value="${item.code}" ${index === 0 ? 'selected' : ''}>${item.label}</option>`).join('');
  }

  function selectedCountry(selectEl) {
    return countries.find((item) => item.code === selectEl.value) || countries[0];
  }

  function phoneOk(selectEl, inputEl) {
    const selected = selectedCountry(selectEl);
    const digits = sanitizeDigits(inputEl.value);
    const minDigits = selected.minDigits || 0;
    const maxDigits = selected.maxDigits || minDigits;
    if (!digits) return { ok: false, digits };
    if (digits.startsWith(selected.dial) && digits.length >= minDigits + selected.dial.length && digits.length <= maxDigits + selected.dial.length) {
      return { ok: true, digits: digits.slice(selected.dial.length), country: selected };
    }
    if (digits.length >= minDigits && digits.length <= maxDigits) {
      return { ok: true, digits, country: selected };
    }
    return { ok: false, digits };
  }

  async function submitLead(form) {
    const isContact = form.dataset.leadType === 'contact';
    const errorEl = form.querySelector('[data-error]');
    const successEl = form.querySelector('[data-success]');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';

    const brand = form.querySelector('[name="brand_name"]');
    const website = form.querySelector('[name="brand_website"]');
    const email = form.querySelector('[name="email_id"]');
    const country = form.querySelector('[name="phone_country"]');
    const phone = form.querySelector('[name="phone_number"]');
    const note = form.querySelector('[name="additional_note"]');

    let ok = true;
    const brandValue = String(brand?.value || '').trim();
    const websiteValue = normalizeWebsite(website?.value || '');
    const emailValue = String(email?.value || '').trim();
    const phoneCheck = phoneOk(country, phone);

    [brand, website, email, country, phone].forEach((el) => {
      if (!el) return;
      const invalid = !String(el.value || '').trim();
      if (invalid) ok = false;
      el.classList.toggle('invalid', invalid);
    });

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
    if (email) email.classList.toggle('invalid', !emailOk);
    if (!emailOk) ok = false;

    if (website) {
      website.classList.toggle('invalid', !websiteValue);
      if (!websiteValue) ok = false;
    }

    if (phone) {
      phone.classList.toggle('invalid', !phoneCheck.ok);
      if (!phoneCheck.ok) ok = false;
    }

    if (!ok) {
      if (errorEl) {
        errorEl.textContent = 'Please fill the required details before sending your message.';
        errorEl.style.display = 'block';
      }
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    const payload = {
      form_type: isContact ? 'contact' : 'audit',
      brand_name: brandValue,
      brand_website: websiteValue,
      email_id: emailValue,
      phone_country: phoneCheck.country.code,
      phone_country_code: `+${phoneCheck.country.dial}`,
      phone_number: `+${phoneCheck.country.dial} ${phoneCheck.digits}`,
      additional_note: String(note?.value || '').trim()
    };

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Submission failed');

      if (form.dataset.successText && successEl) {
        successEl.innerHTML = form.dataset.successText;
        successEl.style.display = 'block';
      } else if (successEl) {
        successEl.innerHTML = '<strong>Thank you for contacting us.</strong> We will get back to you soon!';
        successEl.style.display = 'block';
      }
      form.reset();
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || 'Something went wrong. Please try again.';
        errorEl.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = form.dataset.submitLabel || 'Send Message';
      }
      if (country) fillCountries(country);
    }
  }

  window.MnemixLeadForm = {
    fillCountries,
    normalizeWebsite,
    phoneOk,
    selectedCountry,
    submitLead
  };
})();
