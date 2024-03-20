import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit } from '@angular/core';
import { IFaqCategory } from '../../faq/faq-category.model';
import { IFrequentAsked } from '../../faq/frequent-asked.model';
import { FaqCategoryService } from '../../faq/faq-category.service';
import { FrequentAskedService } from '../../faq/frequent-asked.service';
import SharedModule from 'app/shared/shared.module';

@Component({
  selector: 'jhi-chat-faq',
  standalone: true,
  templateUrl: './chat-faq.component.html',
  styleUrls: ['./chat-faq.component.scss'],
  imports: [SharedModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatFaqComponent implements OnInit {
  faqCategoryList?: IFaqCategory[];
  faqList?: IFrequentAsked[];

  selectedCategory?: IFaqCategory;

  constructor(
    private faqCategoryService: FaqCategoryService,
    private faqService: FrequentAskedService,
  ) {}

  ngOnInit(): void {
    this.faqCategoryService.query().subscribe(
      categories => {
        const tempFaqCategoryList = categories.body || [];
        this.faqService.query().subscribe(
          faqs => {
            this.faqList = faqs.body || [];
            if (tempFaqCategoryList) {
              this.faqCategoryList = [];
              for (const cat of tempFaqCategoryList) {
                if (this.getFaqCount(cat) > 0) {
                  this.faqCategoryList.push(cat);
                }
              }
            }
          },
          () => {},
        );
      },
      () => {},
    );
  }

  public selectCategory(category: IFaqCategory): void {
    this.selectedCategory = category;
  }

  public onBack(): void {
    this.selectedCategory = undefined;
  }

  public getFaqCount(category: IFaqCategory): number {
    const count = this.faqList?.filter(faq => {
      if (faq.category?.label === category.label) {
        return true;
      } else {
        return false;
      }
    }).length;

    return count || 0;
  }

  public getSelectedCategoryFaqs(): IFrequentAsked[] {
    return (
      this.faqList?.filter(faq => {
        if (faq.category?.label === this.selectedCategory?.label) {
          return true;
        } else {
          return false;
        }
      }) || []
    );
  }
}
