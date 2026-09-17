import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightSidebarAyudante } from './right-sidebar-ayudante';

describe('RightSidebarAyudante', () => {
  let component: RightSidebarAyudante;
  let fixture: ComponentFixture<RightSidebarAyudante>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightSidebarAyudante],
    }).compileComponents();

    fixture = TestBed.createComponent(RightSidebarAyudante);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
