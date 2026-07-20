# **HC-Professional V2: Frontend Technical Specification**

**Platform:** HealthConnect (HC-Professional Portal)

**Development Methodology:** Rapid AI-Assisted Agile (1-Week Sprint)

**Frontend Framework:** Angular 19 (Standalone Architecture)

**State Management:** Angular Signals

**Styling & UI:** Angular Material 19 (M3) & TailwindCSS v4

**Data Visualization:** Chart.js (via ng2-charts)

## **1\. Architectural Principles**

To accommodate a 1-week rapid development cycle driven by AI assistance, the frontend architecture prioritizes zero-boilerplate setups, modern reactive paradigms, and utility-first styling.

- **Standalone Components:** No NgModules. All components, pipes, and directives are standalone to simplify AI code generation and reduce coupling.
- **Signal-Driven State:** RxJS is minimized in favor of Angular 19 Signals (signal, computed, effect) for synchronous, highly predictable UI updates (e.g., live search filtering).
- **Native Control Flow:** Utilizing @if, @for, and @switch directly in the templates for optimal rendering performance and cleaner HTML.
- **Hybrid Styling Strategy:** \* **TailwindCSS** handles all layout mapping (CSS Grid/Flexbox), responsive breakpoints, spacing, and typography.
  - **Angular Material (M3)** provides complex interactive primitives (Tabs, Tables, Dialogs, Inputs) natively adhering to Material Design 3 guidelines.

## **2\. Component Specifications**

### **2.1. App Shell (app-root)**

- **Responsibilities:** Manages the global layout, persistent header, branding (Jojo Addison Information Systems), and routing container (\<router-outlet\>).
- **Styling:** Tailwind h-screen w-screen flex flex-col for a locked-viewport application feel.

### **2.2. Dashboard Module (/dashboard)**

- **KPI Panel Component:** \* Reads from a computed Signal representing aggregate clinic stats.
  - Renders Material Cards (\<mat-card\>) for: Total Patients (116), Female (69), Male (47), Kids (37), Urgent (2), Open (5), and Closed (109).
- **Analytics Component:** \* Integrates Chart.js for three visual data points:  
  \* _Line Chart:_ Case vs. Time.  
  \* _Pie Chart:_ Case Distribution.  
  \* _Bar Chart:_ Case vs. Patient Volume.

### **2.3. Patient Directory (/patients)**

- **Live Search Component:** \* Uses a Material Input (\<mat-form-field\>) bound to a searchQuery \= signal('').
- **Data Grid Component:**
  - Uses \<table mat-table\> optimized for rapid rendering.
  - Columns: Date, Patient Name, Action (Eye Icon button).
  - The table data source is a computed value reacting to the searchQuery signal.

### **2.4. Patient Profile (/patients/:id)**

- **Layout:** Tailwind CSS Grid grid-cols-1 md:grid-cols-3 gap-4.
- **Demographics Card (Left Column):** \* Displays static data: Name, DOB, Phone, Email, and Emergency Guardian/Angel details.
- **Clinical Tab Group (Right Columns):**
  - Uses \<mat-tab-group\> to separate contextual data.
  - _Tabs:_ Cases & Visitations, Activity Trail, Medications, Reports.
  - Includes paginators (\<mat-paginator\>) for long lists within the Cases and Activity tabs.

### **2.5. Dialogs & Modals (Overlays)**

- **Case Entry Dialog:**
  - Triggered via \<mat-dialog\>.
  - Form built with ReactiveFormsModule.
  - Includes checkboxes (HPV, Kidney Stones, Prostate Test, X-Ray) and Textareas for Symptoms and Recommendations.
- **Activity Log Dialog:**
  - Simple lightweight dialog capturing _Title of event_ and _Detailed description_.

## **3\. Mock API & Data Integration Strategy**

Since the backend is being built rapidly with Java 25, the frontend will initially decouple using a dedicated API Service with mocked Signals:

@Injectable({ providedIn: 'root' })  
export class PatientService {  
 // AI-generated mock data will populate this initially  
 private patientsSignal \= signal\<Patient\[\]\>(MOCK_PATIENTS);

// Computed signals provide instant reactive state to components  
 readonly totalPatients \= computed(() \=\> this.patientsSignal().length);  
 // ...  
}

_Once the Java 25 backend is ready, the service will be swapped to use Angular's HttpClient with toSignal() or standard observables mapping to the backend REST endpoints._

## **4\. Rapid 1-Week Development Timeline (AI-Assisted)**

This aggressive schedule assumes tight coupling between the developer and the AI code generation agent.

- **Day 1: Scaffold & Shell**
  - Initialize Angular 19 standalone workspace.
  - Install TailwindCSS v4 and Angular Material M3.
  - Generate App Shell, Header, and standard routing configuration.
- **Day 2: Dashboard & Theming**
  - AI generates KPI Card components and Tailwind responsive grids.
  - Integrate Chart.js and wire up mock data signals for the three charts.
- **Day 3: Patient Directory**
  - Implement the Material Data Table and live-search input.
  - Wire up Angular Signals for instant client-side filtering.
- **Day 4: Patient Profile & Tabs**
  - Build the split-view layout.
  - Implement the Material Tab Group and AI-generate the nested tab contents (Activities, Meds, Reports).
- **Day 5: Forms & Overlays**
  - Implement Reactive Forms for the Case Entry Modal.
  - Implement the Activity Log dialog. Ensure proper validation rules are set.
- **Day 6: Backend Integration**
  - Swap mock services with actual API calls to the newly deployed Java 25 backend.
  - Handle JWT authentication headers in Angular HTTP Interceptors.
- **Day 7: QA, Polish & Deployment**
  - Perform responsive design checks (Mobile vs Desktop).
  - Finalize Material M3 theme variables.
  - Compile via AOT and deploy.
