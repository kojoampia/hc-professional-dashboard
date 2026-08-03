import { Injectable } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { IDocument, NewDocument } from '../document.model';

/**
 * A partial Type with required key is used as form input.
 */
type PartialWithRequiredKeyOf<T extends { id: unknown }> = Partial<Omit<T, 'id'>> & { id: T['id'] };

/**
 * Type for createFormGroup and resetForm argument.
 * It accepts IDocument for edit and NewDocumentFormGroupInput for create.
 */
type DocumentFormGroupInput = IDocument | PartialWithRequiredKeyOf<NewDocument>;

type DocumentFormDefaults = Pick<NewDocument, 'id'>;

type DocumentFormGroupContent = {
  id: FormControl<IDocument['id'] | NewDocument['id']>;
  name: FormControl<IDocument['name']>;
  profileId: FormControl<IDocument['profileId']>;
  data: FormControl<IDocument['data']>;
  dataContentType: FormControl<IDocument['dataContentType']>;
  type: FormControl<IDocument['type']>;
  createdDate: FormControl<IDocument['createdDate']>;
  modifiedDate: FormControl<IDocument['modifiedDate']>;
  createdBy: FormControl<IDocument['createdBy']>;
  modifiedBy: FormControl<IDocument['modifiedBy']>;
};

export type DocumentFormGroup = FormGroup<DocumentFormGroupContent>;

@Injectable({ providedIn: 'root' })
export class DocumentFormService {
  createDocumentFormGroup(document?: DocumentFormGroupInput): DocumentFormGroup {
    const documentRawValue = {
      ...this.getFormDefaults(),
      ...(document ?? { id: null }),
    };
    return new FormGroup<DocumentFormGroupContent>({
      id: new FormControl(
        { value: documentRawValue.id, disabled: true },
        {
          nonNullable: true,
          validators: [Validators.required],
        },
      ),
      name: new FormControl(documentRawValue.name),
      profileId: new FormControl(documentRawValue.profileId),
      data: new FormControl(documentRawValue.data),
      dataContentType: new FormControl(documentRawValue.dataContentType),
      type: new FormControl(documentRawValue.type),
      createdDate: new FormControl(documentRawValue.createdDate),
      modifiedDate: new FormControl(documentRawValue.modifiedDate),
      createdBy: new FormControl(documentRawValue.createdBy),
      modifiedBy: new FormControl(documentRawValue.modifiedBy),
    });
  }

  getDocument(form: DocumentFormGroup): IDocument | NewDocument {
    return form.getRawValue();
  }

  resetForm(form: DocumentFormGroup, document: DocumentFormGroupInput): void {
    const documentRawValue = { ...this.getFormDefaults(), ...document };
    form.reset(documentRawValue);
  }

  private getFormDefaults(): DocumentFormDefaults {
    return {
      id: null,
    };
  }
}
