/**
 * UX4G DatePicker & TimePicker
 */

(function (global) {
    "use strict";

    console.log('UX4G Components Script Loaded');

    const makeKeyboardClickable = (el) => {
        if (!el) return;
        if (el.tagName !== 'BUTTON' && el.tagName !== 'INPUT') {
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        }
    };

    // Shared Backdrop
    let backdrop = document.querySelector('.ux4g-date-picker-backdrop');
    const getBackdrop = () => {
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'ux4g-date-picker-backdrop'; 
            document.body.appendChild(backdrop);
        }
        return backdrop;
    };

    const isMobile = () => window.innerWidth <= 576;

    class DatePicker {
        constructor(container) {
            this.container = container;
            this.input = container.querySelector('.ux4g-date-picker-input');
            this.dropdown = container.querySelector('.ux4g-date-picker-dropdown');
            this.calendarGrid = container.querySelector('.ux4g-date-picker-grid');
            this.monthLabel = container.querySelector('.ux4g-date-picker-current');
            
            const navBtns = container.querySelectorAll('.ux4g-date-picker-nav-btn');
            this.prevBtn = navBtns[0];
            this.nextBtn = navBtns[1];
            
            this.confirmBtn = container.querySelector('.ux4g-btn-primary');
            this.cancelBtn = container.querySelector('.ux4g-btn-outline-neutral');
            
            this.currentDate = new Date();
            this.viewDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            this.selectedDate = null;
            this.tempSelectedDate = null;
            
            this.isSelectingYearMonth = false;
            
            this._init();
        }

        _init() {
            if (!this.input || !this.dropdown) return;

            if (this.input.value) {
                const parts = this.input.value.split('/');
                if (parts.length === 3) {
                    this.selectedDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    this.viewDate = new Date(parts[2], parts[1] - 1, 1);
                    this.tempSelectedDate = new Date(this.selectedDate);
                }
            }

            // Keyboard accessibility
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.open();
                }
            });

            this.input.addEventListener('focus', (e) => {
                this.open();
            });

            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
            
            if (this.prevBtn) {
                makeKeyboardClickable(this.prevBtn);
                this.prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(-8);
                    } else {
                        this.changeMonth(-1);
                    }
                });
            }
            
            if (this.nextBtn) {
                makeKeyboardClickable(this.nextBtn);
                this.nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(8);
                    } else {
                        this.changeMonth(1);
                    }
                });
            }

            if (this.monthLabel) {
                makeKeyboardClickable(this.monthLabel);
                this.monthLabel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.isSelectingYearMonth = !this.isSelectingYearMonth;
                    this.render();
                    setTimeout(() => {
                        if (this.isSelectingYearMonth) {
                            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
                            let el = calendarContainer.querySelector('.ux4g-date-picker-year-item.is-selected') || calendarContainer.querySelector('.ux4g-date-picker-year-item');
                            if (el) el.focus();
                        } else {
                            let el = this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }
                    }, 0);
                });
            }

            if (this.confirmBtn) {
                makeKeyboardClickable(this.confirmBtn);
                this.confirmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.isSelectingYearMonth = false;
                        this.render();
                        setTimeout(() => {
                            let el = this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }, 0);
                    } else {
                        this.confirmSelection();
                    }
                });
            }

            if (this.cancelBtn) {
                makeKeyboardClickable(this.cancelBtn);
                this.cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cancelSelection();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && !getBackdrop().contains(e.target)) {
                    this.close();
                }
            });

            getBackdrop().addEventListener('click', () => {
                this.close();
            });

            this.render();
        }

        open() {
            if (this.dropdown) {
                this.tempSelectedDate = this.selectedDate ? new Date(this.selectedDate) : null;
                this.isSelectingYearMonth = false;
                this.dropdown.classList.add('is-open');
                if (isMobile()) {
                    getBackdrop().classList.add('is-active');
                    document.body.style.overflow = 'hidden';
                }
                this.render();
            }
        }

        close() {
            if (this.dropdown) {
                this.dropdown.classList.remove('is-open');
                getBackdrop().classList.remove('is-active');
                document.body.style.overflow = '';
            }
        }

        confirmSelection() {
            this.selectedDate = this.tempSelectedDate ? new Date(this.tempSelectedDate) : null;
            if (this.selectedDate) {
                const day = String(this.selectedDate.getDate()).padStart(2, '0');
                const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                const year = this.selectedDate.getFullYear();
                this.input.value = `${day}/${month}/${year}`;
            } else {
                this.input.value = '';
            }
            this.close();
        }

        cancelSelection() {
            this.tempSelectedDate = this.selectedDate ? new Date(this.selectedDate) : null;
            this.close();
        }

        changeMonth(delta) {
            this.viewDate.setMonth(this.viewDate.getMonth() + delta);
            this.render();
        }

        changeYearRange(delta) {
            this.viewDate.setFullYear(this.viewDate.getFullYear() + delta);
            this.render();
        }

        render() {
            if (this.isSelectingYearMonth) {
                this.renderYearMonthSelection();
            } else {
                this.renderCalendar();
            }
        }

        renderCalendar() {
            const year = this.viewDate.getFullYear();
            const month = this.viewDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${monthNames[month]} ${year} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            const calendarHtml = `
                <div class="ux4g-date-picker-weekdays">
                    <div class="ux4g-date-picker-weekday">Mo</div>
                    <div class="ux4g-date-picker-weekday">Tu</div>
                    <div class="ux4g-date-picker-weekday">We</div>
                    <div class="ux4g-date-picker-weekday">Th</div>
                    <div class="ux4g-date-picker-weekday">Fr</div>
                    <div class="ux4g-date-picker-weekday">Sa</div>
                    <div class="ux4g-date-picker-weekday">Su</div>
                </div>
                <div class="ux4g-date-picker-grid"></div>
            `;
            
            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = calendarHtml;
            this.calendarGrid = calendarContainer.querySelector('.ux4g-date-picker-grid');

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            
            let html = '';
            for (let i = startDay - 1; i >= 0; i--) {
                html += `<div class="ux4g-date-picker-day is-muted">${prevMonthLastDay - i}</div>`;
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(year, month, i);
                const isToday = date.toDateString() === this.currentDate.toDateString();
                const isSelected = this.tempSelectedDate && date.toDateString() === this.tempSelectedDate.toDateString();
                
                let classes = 'ux4g-date-picker-day';
                if (isToday) classes += ' is-today';
                if (isSelected) classes += ' is-selected';
                
                html += `<div class="${classes}" data-date="${i}" tabindex="0">${i}</div>`;
            }
            
            const totalCells = 42;
            const remainingCells = totalCells - (startDay + daysInMonth);
            for (let i = 1; i <= remainingCells; i++) {
                html += `<div class="ux4g-date-picker-day is-muted">${i}</div>`;
            }
            
            this.calendarGrid.innerHTML = html;
            this.calendarGrid.querySelectorAll('.ux4g-date-picker-day:not(.is-muted)').forEach(dayEl => {
                makeKeyboardClickable(dayEl);
                dayEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const day = e.target.dataset.date;
                    this.selectDate(new Date(year, month, day));
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Confirm';
                this.confirmBtn.disabled = !this.tempSelectedDate;
            }
        }

        renderYearMonthSelection() {
            const currentYear = this.viewDate.getFullYear();
            const startYear = Math.floor(currentYear / 8) * 8;
            const endYear = startYear + 7;
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${startYear}-${endYear} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            let html = '<div class="ux4g-date-picker-selection-view">';
            html += '<div class="ux4g-date-picker-year-grid">';
            for (let y = startYear; y <= endYear; y++) {
                const isSelected = y === this.viewDate.getFullYear();
                html += `<div class="ux4g-date-picker-year-item ${isSelected ? 'is-selected' : ''}" data-year="${y}" tabindex="0">${y}</div>`;
            }
            html += '</div>';

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            html += '<div class="ux4g-date-picker-month-grid">';
            monthNamesShort.forEach((m, i) => {
                const isSelected = i === this.viewDate.getMonth();
                html += `<div class="ux4g-date-picker-month-item ${isSelected ? 'is-selected' : ''}" data-month="${i}" tabindex="0">${m}</div>`;
            });
            html += '</div></div>';

            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = html;

            calendarContainer.querySelectorAll('.ux4g-date-picker-year-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setFullYear(parseInt(e.target.dataset.year));
                    this.renderYearMonthSelection();
                    setTimeout(() => {
                        const selectedMonth = this.container.querySelector('.ux4g-date-picker-month-item.is-selected');
                        if (selectedMonth) selectedMonth.focus();
                    }, 0);
                });
            });

            calendarContainer.querySelectorAll('.ux4g-date-picker-month-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setMonth(parseInt(e.target.dataset.month));
                    this.renderYearMonthSelection();
                    if (this.confirmBtn) setTimeout(() => this.confirmBtn.focus(), 0);
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Select date';
                this.confirmBtn.disabled = false;
            }
        }

        selectDate(date) {
            this.tempSelectedDate = date;
            this.render();
            if (this.confirmBtn && !this.confirmBtn.disabled) {
                setTimeout(() => this.confirmBtn.focus(), 0);
            }
        }
    }

    class RangeDatePicker {
        constructor(container) {
            this.container = container;
            this.inputs = container.querySelectorAll('.ux4g-date-picker-input');
            this.dropdown = container.querySelector('.ux4g-date-picker-dropdown');
            this.calendarGrid = container.querySelector('.ux4g-date-picker-grid');
            this.monthLabel = container.querySelector('.ux4g-date-picker-current');
            
            const navBtns = container.querySelectorAll('.ux4g-date-picker-nav-btn');
            this.prevBtn = navBtns[0];
            this.nextBtn = navBtns[1];
            
            this.confirmBtn = container.querySelector('.ux4g-btn-primary');
            this.cancelBtn = container.querySelector('.ux4g-btn-outline-neutral');
            
            this.currentDate = new Date();
            this.viewDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            this.startDate = null;
            this.endDate = null;
            this.tempStartDate = null;
            this.tempEndDate = null;
            this.selectingEnd = false;
            this.isSelectingYearMonth = false;
            
            this._init();
        }

        _init() {
            if (!this.inputs.length || !this.dropdown) return;

            this.inputs.forEach(input => {
                // Keyboard accessibility
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.open();
                    }
                });

                input.addEventListener('focus', (e) => {
                    this.open();
                });

                input.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.open();
                });
            });
            
            if (this.prevBtn) {
                makeKeyboardClickable(this.prevBtn);
                this.prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(-8);
                    } else {
                        this.changeMonth(-1);
                    }
                });
            }
            
            if (this.nextBtn) {
                makeKeyboardClickable(this.nextBtn);
                this.nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(8);
                    } else {
                        this.changeMonth(1);
                    }
                });
            }

            if (this.monthLabel) {
                makeKeyboardClickable(this.monthLabel);
                this.monthLabel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.isSelectingYearMonth = !this.isSelectingYearMonth;
                    this.render();
                    setTimeout(() => {
                        if (this.isSelectingYearMonth) {
                            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
                            let el = calendarContainer.querySelector('.ux4g-date-picker-year-item.is-selected') || calendarContainer.querySelector('.ux4g-date-picker-year-item');
                            if (el) el.focus();
                        } else {
                            let el = this.calendarGrid.querySelector('.is-range-start') || this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }
                    }, 0);
                });
            }

            if (this.confirmBtn) {
                makeKeyboardClickable(this.confirmBtn);
                this.confirmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.isSelectingYearMonth = false;
                        this.render();
                        setTimeout(() => {
                            let el = this.calendarGrid.querySelector('.is-range-start') || this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }, 0);
                    } else {
                        this.confirmSelection();
                    }
                });
            }

            if (this.cancelBtn) {
                this.cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cancelSelection();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && !getBackdrop().contains(e.target)) {
                    this.close();
                }
            });

            getBackdrop().addEventListener('click', () => {
                this.close();
            });

            this.render();
        }

        open() {
            if (this.dropdown) {
                this.tempStartDate = this.startDate ? new Date(this.startDate) : null;
                this.tempEndDate = this.endDate ? new Date(this.endDate) : null;
                this.selectingEnd = this.tempStartDate && !this.tempEndDate;
                this.isSelectingYearMonth = false;
                this.dropdown.classList.add('is-open');
                if (isMobile()) {
                    getBackdrop().classList.add('is-active');
                    document.body.style.overflow = 'hidden';
                }
                this.render();
            }
        }

        close() {
            if (this.dropdown) {
                this.dropdown.classList.remove('is-open');
                getBackdrop().classList.remove('is-active');
                document.body.style.overflow = '';
            }
        }

        confirmSelection() {
            this.startDate = this.tempStartDate ? new Date(this.tempStartDate) : null;
            this.endDate = this.tempEndDate ? new Date(this.tempEndDate) : null;
            this.updateInputs();
            this.close();
        }

        cancelSelection() {
            this.tempStartDate = this.startDate ? new Date(this.tempStartDate) : null;
            this.tempEndDate = this.endDate ? new Date(this.endDate) : null;
            this.close();
        }

        changeMonth(delta) {
            this.viewDate.setMonth(this.viewDate.getMonth() + delta);
            this.render();
        }

        changeYearRange(delta) {
            this.viewDate.setFullYear(this.viewDate.getFullYear() + delta);
            this.render();
        }

        render() {
            if (this.isSelectingYearMonth) {
                this.renderYearMonthSelection();
            } else {
                this.renderCalendar();
            }
        }

        renderCalendar() {
            const year = this.viewDate.getFullYear();
            const month = this.viewDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${monthNames[month]} ${year} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            const calendarHtml = `
                <div class="ux4g-date-picker-weekdays">
                    <div class="ux4g-date-picker-weekday">Mo</div>
                    <div class="ux4g-date-picker-weekday">Tu</div>
                    <div class="ux4g-date-picker-weekday">We</div>
                    <div class="ux4g-date-picker-weekday">Th</div>
                    <div class="ux4g-date-picker-weekday">Fr</div>
                    <div class="ux4g-date-picker-weekday">Sa</div>
                    <div class="ux4g-date-picker-weekday">Su</div>
                </div>
                <div class="ux4g-date-picker-grid"></div>
            `;
            
            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = calendarHtml;
            this.calendarGrid = calendarContainer.querySelector('.ux4g-date-picker-grid');

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            
            let html = '';
            for (let i = startDay - 1; i >= 0; i--) {
                html += `<div class="ux4g-date-picker-day is-muted">${prevMonthLastDay - i}</div>`;
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(year, month, i);
                const isToday = date.toDateString() === this.currentDate.toDateString();
                
                let classes = 'ux4g-date-picker-day';
                if (isToday) classes += ' is-today';
                
                if (this.tempStartDate && date.toDateString() === this.tempStartDate.toDateString()) {
                    classes += ' is-selected is-range-start';
                } else if (this.tempEndDate && date.toDateString() === this.tempEndDate.toDateString()) {
                    classes += ' is-selected is-range-end';
                } else if (this.tempStartDate && this.tempEndDate && date > this.tempStartDate && date < this.tempEndDate) {
                    classes += ' is-in-range';
                }
                
                html += `<div class="${classes}" data-date="${i}" tabindex="0">${i}</div>`;
            }
            
            const totalCells = 42;
            const remainingCells = totalCells - (startDay + daysInMonth);
            for (let i = 1; i <= remainingCells; i++) {
                html += `<div class="ux4g-date-picker-day is-muted">${i}</div>`;
            }
            
            this.calendarGrid.innerHTML = html;
            this.calendarGrid.querySelectorAll('.ux4g-date-picker-day:not(.is-muted)').forEach(dayEl => {
                makeKeyboardClickable(dayEl);
                dayEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const day = e.target.dataset.date;
                    this.handleDateSelection(new Date(year, month, day));
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Confirm';
                this.confirmBtn.disabled = !this.tempStartDate || !this.tempEndDate;
            }
        }

        renderYearMonthSelection() {
            const currentYear = this.viewDate.getFullYear();
            const startYear = Math.floor(currentYear / 8) * 8;
            const endYear = startYear + 7;
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${startYear}-${endYear} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            let html = '<div class="ux4g-date-picker-selection-view">';
            html += '<div class="ux4g-date-picker-year-grid">';
            for (let y = startYear; y <= endYear; y++) {
                const isSelected = y === this.viewDate.getFullYear();
                html += `<div class="ux4g-date-picker-year-item ${isSelected ? 'is-selected' : ''}" data-year="${y}" tabindex="0">${y}</div>`;
            }
            html += '</div>';

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            html += '<div class="ux4g-date-picker-month-grid">';
            monthNamesShort.forEach((m, i) => {
                const isSelected = i === this.viewDate.getMonth();
                html += `<div class="ux4g-date-picker-month-item ${isSelected ? 'is-selected' : ''}" data-month="${i}" tabindex="0">${m}</div>`;
            });
            html += '</div></div>';

            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = html;

            calendarContainer.querySelectorAll('.ux4g-date-picker-year-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setFullYear(parseInt(e.target.dataset.year));
                    this.renderYearMonthSelection();
                    setTimeout(() => {
                        const selectedMonth = this.container.querySelector('.ux4g-date-picker-month-item.is-selected');
                        if (selectedMonth) selectedMonth.focus();
                    }, 0);
                });
            });

            calendarContainer.querySelectorAll('.ux4g-date-picker-month-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setMonth(parseInt(e.target.dataset.month));
                    this.renderYearMonthSelection();
                    if (this.confirmBtn) setTimeout(() => this.confirmBtn.focus(), 0);
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Select date';
                this.confirmBtn.disabled = false;
            }
        }

        handleDateSelection(date) {
            if (!this.tempStartDate || (this.tempStartDate && this.tempEndDate)) {
                this.tempStartDate = date;
                this.tempEndDate = null;
                this.selectingEnd = true;
            } else if (this.selectingEnd) {
                if (date < this.tempStartDate) {
                    this.tempEndDate = this.tempStartDate;
                    this.tempStartDate = date;
                } else {
                    this.tempEndDate = date;
                }
                this.selectingEnd = false;
            }
            this.render();
            if (!this.selectingEnd && this.confirmBtn && !this.confirmBtn.disabled) {
                setTimeout(() => this.confirmBtn.focus(), 0);
            } else if (this.selectingEnd) {
                setTimeout(() => {
                    const selectedEl = this.calendarGrid.querySelector('.is-range-start');
                    if (selectedEl) selectedEl.focus();
                }, 0);
            }
        }

        updateInputs() {
            if (this.startDate) {
                const d = String(this.startDate.getDate()).padStart(2, '0');
                const m = String(this.startDate.getMonth() + 1).padStart(2, '0');
                const y = this.startDate.getFullYear();
                this.inputs[0].value = `${d}/${m}/${y}`;
            } else {
                this.inputs[0].value = '';
            }
            if (this.endDate) {
                const d = String(this.endDate.getDate()).padStart(2, '0');
                const m = String(this.endDate.getMonth() + 1).padStart(2, '0');
                const y = this.endDate.getFullYear();
                this.inputs[1].value = `${d}/${m}/${y}`;
            } else {
                this.inputs[1].value = '';
            }
        }
    }

    class TimePicker {
        constructor(container) {
            this.container = container;
            this.input = container.querySelector('.ux4g-time-picker-input');
            this.dropdown = container.querySelector('.ux4g-time-picker-dropdown');
            this.hhColumn = container.querySelector('[data-column="hh"]');
            this.mmColumn = container.querySelector('[data-column="mm"]');
            this.ampmBtns = container.querySelectorAll('.ux4g-time-picker-ampm-btn');
            this.confirmBtn = container.querySelector('.ux4g-btn-primary');
            this.cancelBtn = container.querySelector('.ux4g-btn-outline-neutral');

            this.selectedHH = null;
            this.selectedMM = null;
            this.selectedAMPM = "PM";

            this.tempHH = null;
            this.tempMM = null;

            this._init();
        }

        _init() {
            if (!this.input || !this.dropdown) return;

            // Keyboard accessibility
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.open();
                }
            });

            this.input.addEventListener('focus', (e) => {
                this.open();
            });

            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });

            this.ampmBtns.forEach(btn => {
                makeKeyboardClickable(btn);
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectedAMPM = e.target.dataset.value;
                    this.updateAMPMUI();
                });
            });

            if (this.confirmBtn) {
                makeKeyboardClickable(this.confirmBtn);
                this.confirmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.confirmBtn.disabled) {
                        this.confirmSelection();
                    }
                });
            }

            if (this.cancelBtn) {
                makeKeyboardClickable(this.cancelBtn);
                this.cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.close();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && !getBackdrop().contains(e.target)) {
                    this.close();
                }
            });

            this.renderColumns();
            this.updateAMPMUI();
            this.validate();
        }

        open() {
            this.tempHH = this.selectedHH;
            this.tempMM = this.selectedMM;
            
            this.dropdown.classList.add('is-open');
            if (isMobile()) {
                getBackdrop().classList.add('is-active');
                document.body.style.overflow = 'hidden';
            }
            
            this.renderColumns();
            this.scrollToSelected();
            this.validate();
        }

        close() {
            this.dropdown.classList.remove('is-open');
            getBackdrop().classList.remove('is-active');
            document.body.style.overflow = '';
        }

        validate() {
            if (this.confirmBtn) {
                this.confirmBtn.disabled = !(this.tempHH && this.tempMM);
            }
        }

        confirmSelection() {
            this.selectedHH = this.tempHH;
            this.selectedMM = this.tempMM;
            this.input.value = `${this.selectedHH} : ${this.selectedMM} ${this.selectedAMPM}`;
            this.close();
        }

        updateAMPMUI() {
            this.ampmBtns.forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.value === this.selectedAMPM);
            });
        }

        renderColumns() {
            // Hours (1-12)
            let hhHtml = '<div class="ux4g-time-picker-col-header">HH</div>';
            for (let i = 1; i <= 12; i++) {
                const val = String(i).padStart(2, '0');
                const isSelected = val === this.tempHH;
                hhHtml += `<div class="ux4g-time-picker-item ${isSelected ? 'is-selected' : ''}" data-value="${val}" tabindex="0">${val}</div>`;
            }
            this.hhColumn.innerHTML = hhHtml;

            // Minutes (0-55, step 5)
            let mmHtml = '<div class="ux4g-time-picker-col-header">MM</div>';
            for (let i = 0; i < 60; i += 5) {
                const val = String(i).padStart(2, '0');
                const isSelected = val === this.tempMM;
                mmHtml += `<div class="ux4g-time-picker-item ${isSelected ? 'is-selected' : ''}" data-value="${val}" tabindex="0">${val}</div>`;
            }
            this.mmColumn.innerHTML = mmHtml;

            // Click events
            this.hhColumn.querySelectorAll('.ux4g-time-picker-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.tempHH = e.target.dataset.value;
                    this.updateColumnSelection(this.hhColumn, this.tempHH);
                    this.validate();
                    if (!this.confirmBtn.disabled) {
                        setTimeout(() => this.confirmBtn.focus(), 0);
                    } else if (!this.tempMM) {
                        const firstMM = this.mmColumn.querySelector('.ux4g-time-picker-item');
                        if (firstMM) setTimeout(() => firstMM.focus(), 0);
                    }
                });
            });

            this.mmColumn.querySelectorAll('.ux4g-time-picker-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.tempMM = e.target.dataset.value;
                    this.updateColumnSelection(this.mmColumn, this.tempMM);
                    this.validate();
                    if (!this.confirmBtn.disabled) {
                        setTimeout(() => this.confirmBtn.focus(), 0);
                    }
                });
            });
        }

        updateColumnSelection(column, value) {
            column.querySelectorAll('.ux4g-time-picker-item').forEach(el => {
                el.classList.toggle('is-selected', el.dataset.value === value);
            });
        }

        scrollToSelected() {
            const columns = [this.hhColumn, this.mmColumn];
            columns.forEach(col => {
                const selected = col.querySelector('.is-selected');
                if (selected) {
                    col.scrollTop = selected.offsetTop - col.offsetTop - 80;
                }
            });
        }
    }

    const init = () => {
        document.querySelectorAll('.ux4g-date-picker-container').forEach(container => {
            if (!container.closest('.ux4g-date-range-picker')) new DatePicker(container);
        });
        document.querySelectorAll('.ux4g-date-range-picker').forEach(container => {
            new RangeDatePicker(container);
        });
        document.querySelectorAll('.ux4g-time-picker-container').forEach(container => {
            new TimePicker(container);
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    global.DatePicker = DatePicker;
    global.RangeDatePicker = RangeDatePicker;
    global.TimePicker = TimePicker;

})(window);
