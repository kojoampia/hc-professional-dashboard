import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'hpd-file-upload-trigger',
  imports: [TranslateModule],
  template: `
    <input
      #fileInput
      class="visually-hidden"
      type="file"
      [accept]="acceptedTypes.join(',')"
      [disabled]="disabled"
      (change)="onFiles($event)"
    />
    <button class="hpd-focusable btn btn-outline-primary" type="button" [disabled]="disabled" (click)="fileInput.click()">
      {{ labelKey | translate }}
    </button>
    @if (validationError) {
      <p class="text-danger" role="alert">{{ validationError | translate }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class FileUploadTriggerComponent {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @Input({ required: true }) labelKey!: string;
  @Input() acceptedTypes: readonly string[] = [];
  @Input() maximumBytes = 5_000_000;
  @Input() disabled = false;
  @Output() readonly filesSelected = new EventEmitter<readonly File[]>();
  @Output() readonly invalidFiles = new EventEmitter<readonly File[]>();

  validationError: string | null = null;

  onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const invalid = files.filter(file => !this.isAccepted(file));
    const accepted = files.filter(file => this.isAccepted(file));
    this.validationError = invalid.length ? 'healthConnect.validation.invalidFile' : null;
    if (invalid.length) {
      this.invalidFiles.emit(invalid);
    }
    if (accepted.length) {
      this.filesSelected.emit(accepted);
    }
    input.value = '';
  }

  private isAccepted(file: File): boolean {
    return file.size <= this.maximumBytes && (!this.acceptedTypes.length || this.acceptedTypes.includes(file.type));
  }
}
