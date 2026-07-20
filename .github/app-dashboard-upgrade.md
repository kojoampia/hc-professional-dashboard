# **HC-Professional Dashboard: Frontend Technical Specification**

**Role:** Senior Angular Frontend Developer.

**Task:** Upgrade the existing Angular 15 frontend to Angular 19, leveraging standalone components, Angular Signals for state management, and TailwindCSS v4 for utility-first styling.

**Frontend Framework:** Angular 19 (Standalone Architecture)

**State Management:** Angular Signals

**Styling & UI:** Angular Material 19 (M3) & TailwindCSS v4

**Data Visualization:** Chart.js (via ng2-charts)

## **1. Architectural Principles**

To accommodate a rapid development cycle driven by AI assistance, the frontend architecture prioritizes zero-boilerplate setups, modern reactive paradigms, and utility-first styling.

* **Standalone Components:** No NgModules. All components, pipes, and directives are standalone to simplify AI code generation and reduce coupling.  
* **Signal-Driven State:** RxJS is minimized in favor of Angular 19 Signals (signal, computed, effect) for synchronous, highly predictable UI updates (e.g., live search filtering).  
* **Native Control Flow:** Utilizing @if, @for, and @switch directly in the templates for optimal rendering performance and cleaner HTML.  
* **Hybrid Styling Strategy:** \* **TailwindCSS** handles all layout mapping (CSS Grid/Flexbox), responsive breakpoints, spacing, and typography.  
  * **Angular Material (M3)** provides complex interactive primitives (Tabs, Tables, Dialogs, Inputs) natively adhering to Material Design 3 guidelines.

## **2. Component Specifications**

### **2.1. App Shell (app-root)**

* **Responsibilities:** Manages the global layout, persistent header, branding (Jojo Addison Information Systems), and routing container (\<router-outlet\>).  
* **Styling:** Tailwind h-screen w-screen flex flex-col for a locked-viewport application feel.

### **2.2. Dashboard Module (/dashboard)**

* **KPI Panel Component:**  Reads from a computed Signal representing aggregate clinic stats.  
  * Renders Material Cards (\<mat-card\>) for: Total Patients (116), Female (69), Male (47), Kids (37), Urgent (2), Open (5), and Closed (109).  
* **Analytics Component:** * Integrates Chart.js for three visual data points:
  * *Line Chart:* Case vs. Time.  
  * *Pie Chart:* Case Distribution.  
  * *Bar Chart:* Case vs. Patient Volume.

### **2.3. Patient Directory (/patients)**

* **Live Search Component:**  Uses a Material Input (\<mat-form-field\>) bound to a searchQuery \= signal('').  
* **Data Grid Component:**  
  * Uses \<table mat-table\> optimized for rapid rendering.  
  * Columns: Date, Patient Name, Action (Eye Icon button).  
  * The table data source is a computed value reacting to the searchQuery signal.

### **2.4. Patient Profile (/patients/:id)**

* **Layout:** Tailwind CSS Grid grid-cols-1 md:grid-cols-3 gap-4.  
* **Demographics Card (Left Column):** * Displays static data: Name, DOB, Phone, Email, and Emergency Guardian/Angel details.
* **Clinical Tab Group (Right Columns):**  
  * Uses \<mat-tab-group\> to separate contextual data.  
  * *Tabs:* Cases & Visitations, Activity Trail, Medications, Reports.  
  * Includes paginators (\<mat-paginator\>) for long lists within the Cases and Activity tabs.

### **2.5. Dialogs & Modals (Overlays)**

* **Case Entry Dialog:** 
  * Triggered via \<mat-dialog\>.  
  * Form built with ReactiveFormsModule.  
  * Includes checkboxes (HPV, Kidney Stones, Prostate Test, X-Ray) and Textareas for Symptoms and Recommendations.  
* **Activity Log Dialog:**  
  * Simple lightweight dialog capturing *Title of event* and *Detailed description*.

## **3. API & Data Integration Strategy**

The frontend is decoupled using a dedicated API Service with Angular's HttpClient. 
* **PatientService:** Handles all patient-related API calls.
```typescript
@Injectable({ providedIn: 'root' })  
export class PatientService {  
  constructor(private http: HttpClient) {}
  getAll() {
    return this.http.get<Patient[]>('hc-professional-service/api/patient');
  }
  get(id: number) {
    return this.http.get<Patient>(`hc-professional-service/api/patient/${id}`);
  }
  update(patient: Patient) {
    return this.http.put(`hc-professional-service/api/patient/${patient.id}`, patient);
  }
  delete(id: number) {
    return this.http.delete(`hc-professional-service/api/patient/${id}`);
  }
}
```
* **DutyRosterService:** Handles all duty-roster-related API calls.
```typescript
@Injectable({ providedIn: 'root' })
export class DutyRosterService {
  constructor(private http: HttpClient) {}
  getAll() {
    return this.http.get<DutyRoster[]>('hc-professional-service/api/duty-roster');
  }
  get(id: number) {
    return this.http.get<DutyRoster>(`hc-professional-service/api/duty-roster/${id}`);
  }
  update(dutyRoster: DutyRoster) {
    return this.http.put(`hc-professional-service/api/duty-roster/${dutyRoster.id}`, dutyRoster);
  }
  delete(id: number) {
    return this.http.delete(`hc-professional-service/api/duty-roster/${id}`);
  }
}
```
**Supported Authority Roles** 
* Doctor
* Nurse
* Paramedic
* Pharmacist
* Therapist
* Carer
* Admin
* User

## **4. Testing & Quality Assurance**