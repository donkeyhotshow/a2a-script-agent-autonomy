# Landing Main Page Module (v6)

## Description

**Version:** 6.0.0
**Status:** Active

This version introduces a contact form and integrates it with the `contact-form` module for submission handling.

## Key Files & Changes in v6

- **`page.json`**: Includes the new `contact-section`.
- **`sections/contact-section.json`**: New section file that includes the contact form template.
- **`templates/forms/contact.json`**: New template defining the contact form UI (name, email, message fields) and submit
  button.
- **`actions/validate-contact-form.json`**: New action file that handles validation of the contact form data before
  potentially calling the submission action in the `contact-form` module.
- **`_i/common.json`**: Updated to include references to the new files.
- **`_i/meta.json`**: Version updated to `6.0.0`.

## Contact Form Workflow

1. The contact form is displayed via `templates/forms/contact.json` included in `page.json` through
   `sections/contact-section.json`.
2. The user fills the form (bound to `contactFormData` context).
3. The user clicks the "Отправить" button.
4. The button's `customHook` calls the `landing-main-page/actions/validate-contact-form.json` action.
5. The `validate-contact-form.json` action checks required fields and email format:
    * If validation fails, it returns an `error` status with field-specific messages and triggers a notification.
    * If validation passes, it calls the `contact-form/actions/receive-submission.json` action, passing the form data.
6. The `contact-form` module handles saving the data and returns a success notification (or potentially an internal
   error).

## Related Documents

- `@/docs/guides/module/01-overview-creating-modules.md`
- `@/docs-implement/contact-form/v1/docs/index.md` 
