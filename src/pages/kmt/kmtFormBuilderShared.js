export const FIELD_LIBRARY = [
  { type: 'text', label: 'Text' },
  { type: 'email', label: 'Email' },
  { type: 'number', label: 'Number' },
  { type: 'currency', label: 'Currency' },
  { type: 'percentage', label: 'Percentage' },
  { type: 'phone', label: 'Phone' },
  { type: 'url', label: 'URL' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'file', label: 'File Upload' },
  { type: 'radio', label: 'Radio' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'button', label: 'Button' },
  { type: 'image', label: 'Image' },
  { type: 'toggle', label: 'Toggle' },
  { type: 'notes', label: 'Notes' },
  { type: 'yesno', label: 'Yes/No' },
]

export const uid = () => `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

export function emptyField(type) {
  return {
    id: uid(),
    type,
    label: `${type} field`,
    placeholder: '',
    mandatory: false,
    maxLength: '',
    defaultValue: '',
    helpText: '',
    options: [{ id: uid(), text: 'Option 1' }],
    dateMode: 'date',
    minDate: '',
    maxDate: '',
    currencyCode: 'USD',
    decimalPlaces: 2,
    fileTypes: [],
    maxFileMb: 10,
    fileMultiple: false,
    buttonStyle: 'primary',
  }
}

/** Matches POC create-document wizard steps (same labels as BUFM/KMT document view). */
export const POC_FORM_TAB_TITLES = [
  'Knowledge Area',
  'Service Categories',
  'Offerings',
  'Extra Pickup',
  'Fees',
]

/**
 * Ensures five tabs aligned with POC steps. Preserves existing tab content by index;
 * sets titles to POC labels. Pads missing tabs with a default group + field.
 */
export function ensureFivePocTabs(form) {
  const base = form && typeof form === 'object' ? form : {}
  const existing = Array.isArray(base.tabs) ? base.tabs.slice(0, 5) : []
  const tabs = []
  for (let i = 0; i < 5; i++) {
    if (existing[i]) {
      tabs.push({ ...existing[i], title: POC_FORM_TAB_TITLES[i] })
    } else {
      tabs.push({
        id: uid(),
        title: POC_FORM_TAB_TITLES[i],
        groups: [
          {
            id: uid(),
            title: 'Basic Information',
            columns: 2,
            fields: [emptyField('text')],
          },
        ],
      })
    }
  }
  return {
    ...base,
    tabs,
    headerGroups: Array.isArray(base.headerGroups) ? base.headerGroups : [],
  }
}

export function defaultForm() {
  return ensureFivePocTabs({ tabs: [] })
}

/** RSAUI service-area workflow template steps (aligned with POC create flow). */
export const RSAUI_FORM_TAB_TITLES = [
  'Request overview',
  'Service area & map',
  'Product configuration',
  'Pricing & fees',
  'Review & submit',
]

/**
 * Ensures five tabs for RSAUI templates with default groups/fields.
 */
export function ensureFiveRsauiTabs(form) {
  const base = form && typeof form === 'object' ? form : {}
  const existing = Array.isArray(base.tabs) ? base.tabs.slice(0, 5) : []
  const tabs = []
  for (let i = 0; i < 5; i++) {
    if (existing[i]) {
      tabs.push({ ...existing[i], title: RSAUI_FORM_TAB_TITLES[i] })
    } else {
      tabs.push({
        id: uid(),
        title: RSAUI_FORM_TAB_TITLES[i],
        groups: [
          {
            id: uid(),
            title: i === 0 ? 'Request & service ID' : i === 1 ? 'Geography & market' : 'RSAUI defaults',
            columns: 2,
            fields: [emptyField('text'), emptyField(i === 3 ? 'currency' : 'notes')],
          },
        ],
      })
    }
  }
  return {
    ...base,
    tabs,
    headerGroups: Array.isArray(base.headerGroups) ? base.headerGroups : [],
  }
}
