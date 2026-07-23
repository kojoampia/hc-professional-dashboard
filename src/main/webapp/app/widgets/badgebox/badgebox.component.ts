import { CommonModule } from '@angular/common';
import { OnInit, Input, Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'hpd-badgebox',
  templateUrl: './badgebox.component.html',
  styleUrls: ['./badgebox.component.scss'],
  imports: [CommonModule],
})
export class BadgeboxComponent implements OnInit {
  @Input() config: {};
  @Input() title!: string;
  @Input() badges!: any[];
  @Input() showSelected = true;
  @Input() small = false;
  @Input() medium = false;
  @Input() large = false;
  @Output() badgeSelected: EventEmitter<any> = new EventEmitter<any>();
  @Output() onClose: EventEmitter<any> = new EventEmitter<any>();

  constructor() {
    this.config = {
      grid: { xs: 2, sm: 3, md: 4, lg: 6, all: 0 },
      speed: 1000,
      interval: 3000,
      point: {
        visible: true,
        pointStyles: `
                .ngxcarouselPoint {
                list-style-type: none;
                text-align: center;
                padding: 12px;
                margin: 0;
                white-space: nowrap;
                overflow: auto;
                box-sizing: border-box;
                }
                .ngxcarouselPoint li {
                display: inline-block;
                border-radius: 50%;
                background: #6b6b6b;
                padding: 5px;
                margin: 0 3px;
                transition: .4s;
                }
                .ngxcarouselPoint li.active {
                    border: 2px solid rgba(0, 0, 0, 0.55);
                    transform: scale(1.2);
                    background: transparent;
                }
            `,
      },
      load: 2,
      loop: true,
      touch: true,
      easing: 'ease',
      animation: 'lazy',
    };
  }

  ngOnInit() {
    console.log('init-badgebox');
    console.log(this.title);
    console.log(this.badges);
  }

  toggleSelected(badge: Badge): void {
    this.badges.forEach(item => (item.selected = false));
    badge.selected = !badge.selected;
    this.badgeSelected.emit(badge);
  }
  closeBadge() {
    // this.badges = null;
    console.log('closing: ' + this.title);
    this.onClose.emit('close');
  }
}

export class Badge {
  constructor(
    public id: string,
    public name?: string,
    public value?: any,
    public description?: string,
    public selected?: boolean,
  ) {}
}
