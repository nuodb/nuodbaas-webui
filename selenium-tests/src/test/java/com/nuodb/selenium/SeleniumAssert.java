package com.nuodb.selenium;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;

public class SeleniumAssert {
    public static class Elements {
        private List<WebElement> elements;

        public Elements(List<WebElement> elements) {
            this.elements = elements;
        }

        public Elements hasSize(int size) {
            assertEquals(elements.size(), size);
            return this;
        }

        public Element get(int index) {
            assertTrue(elements.size() > index && index >= 0);
            return new Element(elements.get(index));
        }
    }

    public static class Element {
        private WebElement element;

        public Element(WebElement element) {
            this.element = element;
        }

        public Element mapContains(String key, String value) {
            List<String> dts = element.findElements(By.tagName("dt")).stream().map(e -> e.getText().trim()).toList();
            List<String> dds = element.findElements(By.tagName("dd")).stream().map(e -> e.getText().trim()).toList();
            assertEquals(dts.size(), dds.size());
            int index = dts.indexOf(key);
            assertNotEquals(index, -1);
            if(value != null) {
                assertEquals(value, dds.get(index));
            }
            return this;
        }

        public Element hasValue(String value) {
            assertEquals(value, element.getText());
            return this;
        }
    }

    public static Elements assertThat(List<WebElement> elements) {
        return new Elements(elements);
    }
}
