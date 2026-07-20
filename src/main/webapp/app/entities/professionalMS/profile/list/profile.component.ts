import { Component, OnInit } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Data, ParamMap, Router, RouterModule } from '@angular/router';
import { combineLatest, filter, Observable, switchMap, tap } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import SharedModule from 'app/shared/shared.module';
import { SortDirective, SortByDirective } from 'app/shared/sort';
import { DurationPipe, FormatMediumDatetimePipe, FormatMediumDatePipe } from 'app/shared/date';
import { ItemCountComponent } from 'app/shared/pagination';
import { FormsModule } from '@angular/forms';

import { ITEMS_PER_PAGE, PAGE_HEADER, TOTAL_COUNT_RESPONSE_HEADER } from 'app/config/pagination.constants';
import { ASC, DESC, SORT, ITEM_DELETED_EVENT, DEFAULT_SORT_DATA } from 'app/config/navigation.constants';
import { IProfile } from '../profile.model';
import { EntityArrayResponseType, ProfileService } from '../service/profile.service';
import { ProfileDeleteDialogComponent } from '../delete/profile-delete-dialog.component';
import { Account } from 'app/core/auth/account.model';
import { ProfileDetailComponent } from '../detail/profile-detail.component';
import { ProfileUpdateComponent } from '../update/profile-update.component';

@Component({
  selector: 'jhi-profile',
  templateUrl: './profile.component.html',
  imports: [RouterModule, FormsModule, SharedModule, ProfileDetailComponent, ProfileUpdateComponent],
})
export class ProfileComponent implements OnInit {
  profile?: IProfile;
  isLoading = false;

  constructor(
    protected profileService: ProfileService,
    protected activatedRoute: ActivatedRoute,
    public router: Router,
    protected modalService: NgbModal,
  ) {}

  trackId = (_index: number, item: IProfile): string => this.profileService.getProfileIdentifier(item);

  ngOnInit(): void {}
}
