import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { SafeHtml, DomSanitizer } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'jhi-file-viewer',
  standalone: true,
  templateUrl: './file-viewer.component.html',
  styleUrls: ['./file-viewer.component.scss'],
})
export class FileViewerComponent implements OnInit, OnDestroy {
  url?: string;
  title?: string;
  safeUrl?: SafeHtml;
  private destroyed$ = new Subject<boolean>();

  constructor(
    private sanitizer: DomSanitizer,
    private modal: NgbActiveModal,
  ) {}

  ngOnInit(): void {
    if (this.url) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.unsubscribe();
  }

  close(): void {
    this.modal.close();
  }
}
