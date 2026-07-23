import { OnInit, Input, Component, EventEmitter, Output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ConsoleLoggerService } from 'app/core/util/console-logger.service';
import { NguCarousel, NguCarouselConfig } from '@ngu/carousel';
import SharedModule from 'app/shared/shared.module';
@Component({
  selector: 'hpd-tilebox',
  imports: [SharedModule, NguCarousel],
  templateUrl: './tilebox.component.html',
  styleUrls: ['./tilebox.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TileboxComponent implements OnInit {
  @Input() config: NguCarouselConfig = {
    grid: { xs: 1, sm: 2, md: 3, lg: 4, all: 0 },
    interval: {
      timing: 5000,
      initialDelay: 1000,
    },
    speed: 500,
    point: {
      visible: true,
      hideOnSingleSlide: true,
    },
    load: 2,
    loop: true,
    touch: true,
    easing: 'cubic-bezier(0, 0, 0.2, 1)', // 'ease',
    animation: 'lazy',
  };
  @Input() title: string | undefined;
  @Input() tiles?: any[] | [];
  @Input() showSelected = true;
  @Output() tileSelected: EventEmitter<any> = new EventEmitter<any>();
  @Input() display = 'images'; // or cards

  constructor(private console: ConsoleLoggerService) {
    if (!this.tiles) {
      this.tiles = [];
    }
  }

  ngOnInit(): void {}

  toggleSelected(tile: Tile): void {
    tile.selected = !tile.selected;
    this.tileSelected.emit(tile);
  }
}

export class Tile {
  selected?: boolean;
  title: string;
  description: string;
  category: string;
  id: string;
  url: string;
  constructor(id: string, title: string, description: string, url: string, category: string, selected?: boolean) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.url = url;
    this.selected = selected;
    this.category = category;
  }
}
