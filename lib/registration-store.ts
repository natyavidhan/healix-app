export type RegistrationBasics = {
  name: string;
  email: string;
  password: string;
};

export type RegistrationDetails = {
  dob: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other' | '';
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
  height_cm: string; // keep as string for simple TextInput handling
  weight_kg: string;
  known_conditions: string;
  allergies: string;
  food_tolerance: string;
  smoking: 'yes' | 'no' | '';
  alcohol: 'yes' | 'no' | '';
  physical_activity: 'low' | 'moderate' | 'high' | '';
  diet_type: 'veg' | 'nonveg' | 'vegan' | '';
};

type Draft = {
  basics: RegistrationBasics | null;
  details: RegistrationDetails | null;
};

const draft: Draft = {
  basics: null,
  details: null,
};

export function setBasics(basics: RegistrationBasics) {
  draft.basics = basics;
}

export function getBasics() {
  return draft.basics;
}

export function setDetails(details: RegistrationDetails) {
  draft.details = details;
}

export function getDetails() {
  return draft.details;
}

export function resetRegistration() {
  draft.basics = null;
  draft.details = null;
}

export function getSummary() {
  return { ...draft };
}
